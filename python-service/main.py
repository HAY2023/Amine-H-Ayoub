from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from pydantic import BaseModel
import requests
import numpy as np
import librosa
import torch
from typing import Optional
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
HF_TOKEN = os.getenv("HF_TOKEN")

app = FastAPI(title="Audio Segmentation Service", version="1.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class ProcessAudioRequest(BaseModel):
    audioUrl: str
    surahNumber: int
    ayahCount: int
    sessionId: Optional[str] = None

class ProcessAudioResponse(BaseModel):
    success: bool
    segments: list
    duration: float
    processingTimeMs: int

# Global Models
vad_model = None
utils = None
diarization_pipeline = None

@app.on_event("startup")
async def load_models():
    global vad_model, utils, diarization_pipeline
    
    print("Loading Silero VAD...")
    try:
        vad_model, utils = torch.hub.load('snakers4/silero-vad', model='silero_vad')
        print("✅ Silero VAD loaded")
    except Exception as e:
        print(f"⚠️ Silero VAD Error: {e}")

    print("Loading Pyannote Diarization Pipeline...")
    try:
        from pyannote.audio import Pipeline
        if HF_TOKEN and HF_TOKEN != "your_huggingface_token_here":
            diarization_pipeline = Pipeline.from_pretrained("pyannote/speaker-diarization-3.0", use_auth_token=HF_TOKEN)
            print("✅ Pyannote Diarization Pipeline loaded successfully")
        else:
            print("⚠️ HF_TOKEN not set correctly. Pyannote cannot be loaded. Will use fallback logic.")
    except Exception as e:
        print(f"⚠️ Error loading Pyannote: {e}")

@app.post("/process-audio")
async def process_audio(request: ProcessAudioRequest):
    try:
        start = datetime.now()
        
        # Download Audio
        resp = requests.get(request.audioUrl, timeout=30)
        temp_file = f"/tmp/audio_{int(datetime.now().timestamp()*1000)}.wav"
        with open(temp_file, 'wb') as f:
            f.write(resp.content)
        
        # Load audio with librosa
        y, sr = librosa.load(temp_file, sr=16000, mono=True)
        duration = len(y) / sr
        
        segments = []
        
        # Stage 1: Noise Reduction
        import noisereduce as nr
        import soundfile as sf
        y_clean = nr.reduce_noise(y=y, sr=sr)
        
        # Normalize
        y_norm = y_clean / (np.max(np.abs(y_clean)) + 1e-7)
        
        clean_temp = temp_file.replace(".wav", "_clean.wav")
        sf.write(clean_temp, y_norm, sr)
        
        if diarization_pipeline is not None:
            # Stage 2 & 4: VAD and Speaker Diarization via Pyannote
            diarization = diarization_pipeline(clean_temp, num_speakers=2)
            
            # Stage 5: Speaker Identification (Simulated)
            speaker_mapping = {} 
            raw_segments = []
            
            for turn, _, speaker in diarization.itertracks(yield_label=True):
                raw_segments.append({
                    "start": turn.start,
                    "end": turn.end,
                    "speaker": speaker
                })
            
            if raw_segments:
                # Assuming Teacher speaks first
                first_speaker = raw_segments[0]["speaker"]
                speaker_mapping[first_speaker] = "teacher"
                
                # Assign the other speaker as "kids"
                for seg in raw_segments:
                    if seg["speaker"] not in speaker_mapping:
                        speaker_mapping[seg["speaker"]] = "kids"
                        break
                        
                for i, seg in enumerate(raw_segments):
                    role = speaker_mapping.get(seg["speaker"], "kids")
                    ayah = (i // 2) + 1
                    
                    segments.append({
                        "id": f"split-{int(datetime.now().timestamp() * 1000)}-{i}",
                        "start": round(seg["start"], 3),
                        "end": round(seg["end"], 3),
                        "speaker": role,
                        "ayah": ayah,
                        "label": f"سورة {request.surahNumber} - آية {ayah} ({'معلم' if role == 'teacher' else 'طفل'})"
                    })
        else:
            # Fallback: Use Silero VAD without Diarization if Pyannote isn't loaded
            if vad_model is not None and utils is not None:
                (get_speech_ts, _, _, _, _) = utils
                # Ensure tensor is float32
                audio_tensor = torch.tensor(y_norm, dtype=torch.float32)
                
                speech_timestamps = get_speech_ts(
                    audio_tensor,
                    vad_model,
                    threshold=0.5,
                    min_speech_duration_ms=300,
                    min_silence_duration_ms=200
                )
                
                for i, ts in enumerate(speech_timestamps):
                    role = "teacher" if i % 2 == 0 else "kids"
                    ayah = (i // 2) + 1
                    start_s = ts['start'] / 16000
                    end_s = ts['end'] / 16000
                    
                    segments.append({
                        "id": f"split-{int(datetime.now().timestamp() * 1000)}-{i}",
                        "start": round(start_s, 3),
                        "end": round(end_s, 3),
                        "speaker": role,
                        "ayah": ayah,
                        "label": f"سورة {request.surahNumber} - آية {ayah} ({'معلم' if role == 'teacher' else 'طفل'})"
                    })
            else:
                raise Exception("Neither Pyannote nor Silero VAD could be loaded.")
        
        # Cleanup
        if os.path.exists(temp_file):
            os.remove(temp_file)
        if os.path.exists(clean_temp):
            os.remove(clean_temp)
            
        proc_time = int((datetime.now() - start).total_seconds() * 1000)
        
        return {
            "success": True,
            "segments": segments,
            "duration": duration,
            "processingTimeMs": proc_time
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health():
    return {"status": "ok", "pyannote_ready": diarization_pipeline is not None}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
