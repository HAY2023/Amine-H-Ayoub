import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Scissors, Link2, Loader2, Zap, Sparkles } from "lucide-react";
import { getAllSurahs } from "../data/quranData";
import { getPageAyahBoxes, savePageAyahBoxes, getAllPageSources } from "../data/ayahCoordinates";
import { getCustomPages } from "../data/customPages";
import { saveSurahTimings, AudioSegment } from "../data/ayahTimings";
import { toast } from "../hooks/use-toast";

const DEFAULT_SERVICE_URL = "https://hammoualiyoucef20-quran-audio.hf.space";
const SERVICE_URL_KEY = "quran:splitServiceUrl";

export default function LinkAudioPage() {
  const surahs = getAllSurahs();
  const [surahNum, setSurahNum] = useState<number>(surahs[0]?.number ?? 1);
  const [surahName, setSurahName] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [engine, setEngine] = useState<"vad" | "gemini">("vad");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [segments, setSegments] = useState<AudioSegment[]>([]);

  const serviceUrl = (() => { try { return localStorage.getItem(SERVICE_URL_KEY) || DEFAULT_SERVICE_URL; } catch { return DEFAULT_SERVICE_URL; } })();

  const persist = (segs: AudioSegment[]) => {
    const teacher = segs.filter(s => s.speaker === "teacher").map(s => s.start);
    const kids = segs.filter(s => s.speaker === "kids").map(s => s.start);
    const payload: { teacher: number[]; segments: AudioSegment[]; kids?: number[]; kidsStart?: number } = { teacher, segments: segs };
    if (kids.length > 0) { payload.kids = kids; payload.kidsStart = kids[0]; }
    saveSurahTimings(surahNum, payload);
  };

  // يكتب وقت كل آية (معلم/طفل) داخل مربّع تظليلها المطابق عبر كل الصفحات
  const linkToShading = async (segs: AudioSegment[]): Promise<number> => {
    const tByAyah = new Map<number, AudioSegment>();
    const kByAyah = new Map<number, AudioSegment>();
    segs.forEach(s => {
      if (!s.ayah || s.ayah < 1) return;
      if (s.speaker === "kids") { if (!kByAyah.has(s.ayah)) kByAyah.set(s.ayah, s); }
      else { if (!tByAyah.has(s.ayah)) tByAyah.set(s.ayah, s); }
    });
    const allSrcs = [...getAllPageSources(), ...getCustomPages().map(p => p.src)];
    let linked = 0;
    for (const src of allSrcs) {
      const boxes = getPageAyahBoxes(src);
      if (!boxes.some(b => b.surah === surahNum)) continue;
      let changed = false;
      const next = boxes.map(b => {
        if (b.surah !== surahNum) return b;
        const t = tByAyah.get(b.ayah), k = kByAyah.get(b.ayah);
        if (!t && !k) return b;
        changed = true; linked++;
        return { ...b, audioStart: t ? t.start : b.audioStart, audioEnd: t ? t.end : b.audioEnd, kidsStart: k ? k.start : b.kidsStart, kidsEnd: k ? k.end : b.kidsEnd };
      });
      if (changed) await savePageAyahBoxes(src, next);
    }
    return linked;
  };

  const run = async () => {
    if (!file) { toast({ title: "⚠️ ارفع ملف الصوت أولاً", variant: "destructive" }); return; }
    const base = serviceUrl.trim().replace(/\/$/, "");
    const label = surahName.trim() || `سورة ${surahNum}`;
    setBusy(true); setSegments([]);
    try {
      setStatus(engine === "gemini" ? "Gemini يقسّم الصوت..." : "الخدمة تقسّم الصوت...");
      const form = new FormData();
      form.append("file", file, file.name || `${surahNum}.mp3`);
      form.append("leading", "1");
      form.append("surahLabel", label);
      const res = await fetch(`${base}${engine === "gemini" ? "/split-gemini" : "/split"}`, { method: "POST", body: form });
      if (!res.ok) { const t = await res.text().catch(() => ""); throw new Error(`الخدمة ردّت ${res.status} ${t.slice(0, 120)}`); }
      const data = await res.json();
      const segs: AudioSegment[] = (data.segments || []).map((s: AudioSegment) => ({ ...s }));
      if (segs.length === 0) throw new Error("لم تُرجِع الخدمة أي مقاطع");
      setSegments(segs);
      persist(segs);
      setStatus("ربط المقاطع بالتظليل...");
      const linked = await linkToShading(segs);
      if (linked === 0) {
        toast({ title: `✅ قُسّم (${segs.length} مقطع) لكن لا مربعات لهذه السورة`, description: "أنشئ تظليل السورة في المعايرة ثم أعد الربط." });
      } else {
        toast({ title: "✅ تم التقسيم والربط", description: `${segs.length} مقطع · ${linked} آية رُبطت بالتظليل — تظهر في المصحف.` });
      }
    } catch (e) {
      toast({ title: "❌ فشل", description: e instanceof Error ? e.message : "خطأ", variant: "destructive" });
    } finally { setBusy(false); setStatus(""); }
  };

  return (
    <div className="min-h-screen page-nour text-foreground" dir="rtl">
      <div className="mx-auto max-w-md px-4 py-4 space-y-4">
        <header className="flex items-center justify-between">
          {false && (
          <Link to="/recitation-methods" className="flex h-10 items-center gap-1 rounded-full bg-secondary text-secondary-foreground px-4 text-sm font-bold hover:brightness-95 active:scale-95">
            <ArrowRight className="h-4 w-4" /> رجوع
          </Link>
          )}
          <h1 className="font-extrabold text-lg text-gradient-gold flex items-center gap-1.5"><Link2 className="w-5 h-5 text-accent" /> ربط الصوت بالتظليل</h1>
          <span className="w-16" />
        </header>

        <div className="card-nour p-4 space-y-3 animate-fade-up shadow-soft">
          <p className="text-xs text-muted-foreground leading-relaxed">ارفع تسجيل السورة (معلم ثم طفل) → يُقسَّم → يُربط بمربعات التظليل تلقائياً (وقت كل آية) فيُشغّلها المصحف.</p>

          <label className="block">
            <span className="text-[11px] text-muted-foreground">السورة</span>
            <select value={surahNum} onChange={(e) => setSurahNum(parseInt(e.target.value, 10))} className="w-full rounded-lg bg-secondary border-border p-2 text-sm text-secondary-foreground">
              {surahs.map(s => <option key={s.number} value={s.number}>{s.number} — {s.name}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="text-[11px] text-muted-foreground">اسم مخصّص (اختياري)</span>
            <input value={surahName} onChange={(e) => setSurahName(e.target.value)} placeholder="مثل: النبأ" className="w-full rounded-lg bg-secondary border-border p-2 text-sm text-secondary-foreground outline-none focus:border-accent" />
          </label>

          <label className="block">
            <span className="text-[11px] text-muted-foreground">ملف الصوت</span>
            <input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-[12px] text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:px-3 file:py-1.5 file:text-xs" />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setEngine("vad")} className={`p-2 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1 ${engine === "vad" ? "bg-violet-600 text-white" : "bg-secondary text-muted-foreground"}`}><Zap className="w-3.5 h-3.5" /> بالخدمة</button>
            <button onClick={() => setEngine("gemini")} className={`p-2 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1 ${engine === "gemini" ? "bg-gradient-to-r from-sky-600 to-emerald-600 text-white" : "bg-secondary text-muted-foreground"}`}><Sparkles className="w-3.5 h-3.5" /> Gemini</button>
          </div>

          <button onClick={run} disabled={busy || !file}
            className="w-full p-3 rounded-xl btn-gold font-extrabold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98]">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Scissors className="h-4 w-4" /><Link2 className="h-4 w-4" /></>}
            {busy ? (status || "جارٍ...") : "قسّم واربط بالتظليل"}
          </button>

          {segments.length > 0 && (
            <div className="rounded-xl bg-muted p-3 text-center">
              <div className="text-2xl font-bold text-success">{segments.length}</div>
              <div className="text-xs text-muted-foreground">مقطع · معلم {segments.filter(s => s.speaker === "teacher").length} · طفل {segments.filter(s => s.speaker === "kids").length}</div>
            </div>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
          نصيحة: أنشئ تظليل السورة في <Link to="/calibrate" className="text-accent underline">المعايرة</Link> أولاً (مربعات الآيات) ليرتبط بها الصوت.
        </p>
      </div>
    </div>
  );
}
