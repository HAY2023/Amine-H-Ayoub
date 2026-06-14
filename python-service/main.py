"""
خدمة تقسيم الصوت القرآني (معلم/طفل) — خفيفة وقابلة للنشر على Fly.io المجاني.

المنهج (بلا PyTorch، بلا عدد آيات مُسبق):
  1) كشف الكلام  : webrtcvad (قوي وخفيف) مع fallback للطاقة.
  2) التمييز      : طبقة الصوت (median F0 عبر librosa.pyin) — المعلم منخفض، الطفل عالٍ،
                    عتبة ديناميكية (أكبر فجوة) تفصل المجموعتين تلقائياً.
  3) الترقيم      : تجميع أزواج (معلم↔طفل) بالتكرار، مع طرح المقاطع التمهيدية (بسملة/استعاذة).
"""
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import numpy as np
import librosa
import os
import time
import requests

app = FastAPI(title="Quran Audio Segmentation", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SR = 16000


# ─────────────────────── Speech detection (VAD) ───────────────────────

def _vad_webrtc(y: np.ndarray, sr: int):
    """كشف الكلام بـ webrtcvad. يُرجع None إن لم تتوفر المكتبة."""
    try:
        import webrtcvad
    except Exception:
        return None

    vad = webrtcvad.Vad(2)  # 0..3 (3 = أكثر صرامة)
    pcm16 = (np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes()
    frame_ms = 30
    frame_len = int(sr * frame_ms / 1000)          # عيّنات لكل إطار
    frame_bytes = frame_len * 2                      # 16-bit
    n = len(pcm16) // frame_bytes

    flags = []
    for i in range(n):
        chunk = pcm16[i * frame_bytes:(i + 1) * frame_bytes]
        try:
            flags.append(vad.is_speech(chunk, sr))
        except Exception:
            flags.append(False)

    return _flags_to_regions(flags, frame_ms / 1000.0)


def _vad_energy(y: np.ndarray, sr: int):
    """fallback: كشف بالطاقة مع عتبة تكيّفية."""
    hop = int(sr * 0.01)      # 10ms
    win = int(sr * 0.025)     # 25ms
    energies = []
    for i in range(0, max(1, len(y) - win), hop):
        seg = y[i:i + win]
        energies.append(float(np.sqrt(np.mean(seg * seg) + 1e-12)))
    energies = np.array(energies)
    if len(energies) < 2:
        return [(0.0, len(y) / sr)]
    srt = np.sort(energies)
    thr = (srt[int(len(srt) * 0.25)] + srt[int(len(srt) * 0.75)]) / 2 * 1.4
    flags = [e > thr for e in energies]
    return _flags_to_regions(flags, hop / sr)


def _flags_to_regions(flags, frame_dur, min_speech=0.20, max_silence=0.15):
    """تحويل أعلام الكلام إلى مناطق (start,end) بالثواني مع دمج الصمت القصير."""
    regions = []
    in_sp = False
    start = 0.0
    silence = 0.0
    for i, f in enumerate(flags):
        t = i * frame_dur
        if f:
            silence = 0.0
            if not in_sp:
                in_sp = True
                start = t
        else:
            if in_sp:
                silence += frame_dur
                if silence > max_silence:
                    end = t - silence
                    if end - start > min_speech:
                        regions.append((max(0.0, start - 0.05), end + 0.05))
                    in_sp = False
    if in_sp:
        end = len(flags) * frame_dur
        if end - start > min_speech:
            regions.append((max(0.0, start - 0.05), end))
    return regions


# ─────────────────────── Pitch & classification ───────────────────────

def _median_pitch(seg: np.ndarray, sr: int) -> float:
    """طبقة الصوت المتوسطة (F0) للمقطع — 0 إن لم تُكشف نغمة."""
    if len(seg) < int(sr * 0.05):
        return 0.0
    try:
        f0, voiced, _ = librosa.pyin(
            seg, fmin=80, fmax=500, sr=sr, frame_length=1024
        )
        vals = f0[~np.isnan(f0)]
        if len(vals) == 0:
            return 0.0
        return float(np.median(vals))
    except Exception:
        return 0.0


def _classify(pitches):
    """عتبة ديناميكية بأكبر فجوة بين قيم الطبقة المرتبة."""
    valid = sorted(p for p in pitches if p > 0)
    if len(valid) < 2:
        return 200.0
    max_gap, thr = -1.0, 200.0
    for i in range(1, len(valid)):
        gap = valid[i] - valid[i - 1]
        if gap > max_gap:
            max_gap, thr = gap, (valid[i] + valid[i - 1]) / 2
    if max_gap < 40:  # متحدث واحد فقط
        thr = valid[len(valid) // 2] + 1
    return thr


# ─────────────────────── Core segmentation ───────────────────────

def segment_audio(y: np.ndarray, sr: int, leading: int = 1, surah_label: str = ""):
    y = y / (np.max(np.abs(y)) + 1e-7)

    regions = _vad_webrtc(y, sr) or _vad_energy(y, sr)
    if not regions:
        raise ValueError("لم يُكشف أي كلام في الملف")

    pitches = [_median_pitch(y[int(s * sr):int(e * sr)], sr) for s, e in regions]
    thr = _classify(pitches)
    speakers = ["teacher" if (p <= 0 or p < thr) else "kids" for p in pitches]

    # كشف النمط: متتابع (معلم ثم طفل) أم متناوب
    half = len(regions) // 2
    fh_kids = sum(1 for s in speakers[:half] if s == "kids") / max(1, half)
    sh_kids = sum(1 for s in speakers[half:] if s == "kids") / max(1, len(regions) - half)
    consecutive = fh_kids < 0.3 and sh_kids > 0.7

    lead = max(0, int(leading))

    def lead_label(u):
        return "الاستعاذة" if (lead >= 2 and u == 1) else "البسملة"

    segs = []
    t_u = k_u = inter = 0
    for i, (s, e) in enumerate(regions):
        is_t = speakers[i] == "teacher"
        if consecutive:
            unit = (t_u := t_u + 1) if is_t else (k_u := k_u + 1)
        else:
            if is_t:
                inter += 1
                unit = inter
            else:
                unit = inter if inter > 0 else 1
        ayah_num = unit - lead
        is_lead = ayah_num < 1
        name = lead_label(unit) if is_lead else f"آية {ayah_num}"
        segs.append({
            "id": f"svc-{int(time.time() * 1000)}-{i}",
            "start": round(float(s), 3),
            "end": round(float(e), 3),
            "speaker": "teacher" if is_t else "kids",
            "ayah": 0 if is_lead else ayah_num,
            "label": f"{surah_label} - {name} ({'معلم' if is_t else 'طفل'})".strip(" -"),
        })
    return segs


# ─────────────────────── API ───────────────────────

class UrlRequest(BaseModel):
    audioUrl: str
    leading: Optional[int] = 1
    surahLabel: Optional[str] = ""


def _load_bytes(data: bytes):
    # اكتب ملفاً مؤقتاً لدعم mp3 عبر ffmpeg/audioread (libsndfile قد لا يدعم mp3 من الذاكرة)
    import tempfile
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tf:
        tf.write(data)
        path = tf.name
    try:
        y, _ = librosa.load(path, sr=SR, mono=True)
    finally:
        try:
            os.remove(path)
        except Exception:
            pass
    return y


@app.post("/split")
async def split_upload(file: UploadFile = File(...), leading: int = Form(1), surahLabel: str = Form("")):
    """تقسيم ملف صوتي مرفوع مباشرةً (يعمل مع أي مصدر صوت)."""
    try:
        t0 = time.time()
        y = _load_bytes(await file.read())
        segs = segment_audio(y, SR, leading, surahLabel)
        return {
            "success": True,
            "segments": segs,
            "duration": round(len(y) / SR, 3),
            "processingTimeMs": int((time.time() - t0) * 1000),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/split-url")
async def split_url(req: UrlRequest):
    """تقسيم صوت من رابط (CDN)."""
    try:
        t0 = time.time()
        resp = requests.get(req.audioUrl, timeout=60)
        resp.raise_for_status()
        y = _load_bytes(resp.content)
        segs = segment_audio(y, SR, req.leading or 1, req.surahLabel or "")
        return {
            "success": True,
            "segments": segs,
            "duration": round(len(y) / SR, 3),
            "processingTimeMs": int((time.time() - t0) * 1000),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok", "service": "quran-audio-segmentation", "version": "2.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
