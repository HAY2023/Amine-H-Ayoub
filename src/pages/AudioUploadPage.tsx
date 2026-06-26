import React, { useState, useRef, useMemo } from "react";
import { Upload, Play, AlertCircle, CheckCircle2, Clock, ArrowRight, FileAudio, Image as ImageIcon } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { useAudioSegmentation } from "../hooks/useAudioSegmentation";
import { getSurahName, getSurahAyahCount, getAllSurahs } from "../data/quranData";

interface SegmentResult {
  start: number;
  end: number;
  speaker: "teacher" | "kids";
  ayah?: number;
}

interface ProcessingState {
  status: "idle" | "uploading" | "processing" | "completed" | "error";
  progress: number;
  segments: SegmentResult[];
  error?: string;
  duration?: number;
  processingTime?: number;
}

export function AudioUploadPage() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [surahNumber, setSurahNumber] = useState<number>(1);
  const [state, setState] = useState<ProcessingState>({ status: "idle", progress: 0, segments: [] });
  const audioInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { processAudio } = useAudioSegmentation();
  const surahs = getAllSurahs();

  // Get surah name and ayah count automatically
  const currentSurah = useMemo(() => {
    const surah = surahs.find(s => s.number === surahNumber);
    return surah || { number: surahNumber, name: `سورة ${surahNumber}`, ayahCount: 0 };
  }, [surahNumber, surahs]);

  // حفظ الملف في السيرفر
  const saveToServer = async (type: string, data: any) => {
    try {
      const { error } = await supabase
        .from("upload_records")
        .insert([{
          type, // "audio" | "image" | "surah"
          surah_number: surahNumber,
          surah_name: currentSurah.name,
          data: JSON.stringify(data),
          created_at: new Date(),
        }]);

      if (error) throw error;
      console.log(`✅ تم حفظ ${type} في السيرفر`);
    } catch (e) {
      console.error(`❌ خطأ حفظ ${type}:`, e);
    }
  };

  const handleAudioSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (!["audio/mpeg", "audio/wav", "audio/mp3"].includes(file.type)) {
        setState(prev => ({ ...prev, status: "error", error: "فقط MP3 و WAV مدعومة" }));
        return;
      }
      setAudioFile(file);
      setState({ status: "idle", progress: 0, segments: [] });

      // حفظ في السيرفر
      await saveToServer("audio", {
        filename: file.name,
        size: file.size,
        type: file.type,
      });
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
        setState(prev => ({ ...prev, status: "error", error: "فقط JPG و PNG مدعومة" }));
        return;
      }
      setImageFile(file);

      // حفظ في السيرفر
      await saveToServer("image", {
        filename: file.name,
        size: file.size,
        type: file.type,
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add("border-blue-500", "bg-blue-50");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("border-blue-500", "bg-blue-50");
  };

  const handleAudioDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove("border-blue-500", "bg-blue-50");
    if (e.dataTransfer.files?.[0]) {
      setAudioFile(e.dataTransfer.files[0]);
    }
  };

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove("border-blue-500", "bg-blue-50");
    if (e.dataTransfer.files?.[0]) {
      setImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleProcess = async () => {
    if (!audioFile) {
      setState(prev => ({ ...prev, status: "error", error: "اختر ملف صوتي أولاً" }));
      return;
    }

    setState(prev => ({ ...prev, status: "uploading", progress: 10 }));

    try {
      const sessionId = `session_${Date.now()}`;
      const filename = `${sessionId}_${audioFile.name}`;
      const filepath = `audio-uploads/${sessionId}/${filename}`;

      // Upload audio
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("quran-audio")
        .upload(filepath, audioFile, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        throw new Error(`فشل الرفع: ${uploadError.message}`);
      }

      setState(prev => ({ ...prev, progress: 30 }));

      const { data: urlData } = supabase.storage
        .from("quran-audio")
        .getPublicUrl(filepath);

      const storageUrl = urlData?.publicUrl;
      if (!storageUrl) {
        throw new Error("فشل الحصول على رابط التخزين");
      }

      setState(prev => ({ ...prev, status: "processing", progress: 40 }));

      const result = await processAudio({
        storageUrl,
        surahNumber,
        ayahCount: currentSurah.ayahCount,
        sessionId,
      });

      setState(prev => ({
        ...prev,
        status: "completed",
        progress: 100,
        segments: result.segments,
        duration: result.duration,
        processingTime: result.processingTimeMs,
      }));

      // حفظ النتائج في السيرفر
      await saveToServer("surah", {
        surahNumber,
        surahName: currentSurah.name,
        segments: result.segments,
        duration: result.duration,
        processingTimeMs: result.processingTimeMs,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "خطأ غير معروف";
      setState(prev => ({
        ...prev,
        status: "error",
        error: message,
        progress: 0,
      }));
    }
  };

  return (
    <div className="min-h-screen page-nour text-foreground p-4" dir="rtl">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <FileAudio className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gradient-gold">📤 رفع صوتي وصور</h1>
              <p className="text-muted-foreground text-sm">رفع تلاوة مع صور السورة لتقسيم ومعالجة تلقائية</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Audio Upload */}
          <div className="card-nour rounded-xl shadow-soft animate-fade-up p-6">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <FileAudio className="w-5 h-5 text-accent" />
              الملف الصوتي
            </h2>
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center transition-all hover:border-accent/50 hover:bg-secondary/50 cursor-pointer"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleAudioDrop}
              onClick={() => audioInputRef.current?.click()}
            >
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                onChange={handleAudioSelect}
                className="hidden"
              />
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-medium mb-1">اسحب الملف أو اضغط للاختيار</p>
              <p className="text-muted-foreground text-sm">MP3 أو WAV (أقصى 50MB)</p>
              {audioFile && (
                <div className="mt-4 p-3 bg-success/10 border border-success/40 rounded-lg">
                  <p className="text-success text-sm font-medium">✅ {audioFile.name}</p>
                </div>
              )}
            </div>
          </div>

          {/* Image Upload */}
          <div className="card-nour rounded-xl shadow-soft p-6">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-accent" />
              صور السورة (اختياري)
            </h2>
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center transition-all hover:border-accent/50 hover:bg-secondary/50 cursor-pointer"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleImageDrop}
              onClick={() => imageInputRef.current?.click()}
            >
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-medium mb-1">اسحب الصورة أو اضغط للاختيار</p>
              <p className="text-muted-foreground text-sm">JPG أو PNG</p>
              {imageFile && (
                <div className="mt-4 p-3 bg-success/10 border border-success/40 rounded-lg">
                  <p className="text-success text-sm font-medium">✅ {imageFile.name}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Configuration */}
        <div className="card-nour rounded-xl shadow-soft p-6 mb-6">
          <h2 className="text-lg font-bold text-foreground mb-4">⚙️ السورة</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">رقم السورة</label>
              <input
                type="number"
                min={1}
                max={114}
                value={surahNumber}
                onChange={e => setSurahNumber(parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">اسم السورة (قابل للتعديل)</label>
              <input
                type="text"
                value={currentSurah.name}
                onChange={e => {
                  // السماح بتعديل الاسم
                  currentSurah.name = e.target.value;
                }}
                className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-accent font-bold focus:outline-none focus:border-accent"
              />
            </div>
          </div>
          <div className="mt-4 p-3 bg-success/10 border border-success/40 rounded-lg">
            <p className="text-success text-sm">📖 عدد الآيات: <span className="font-bold">{currentSurah.ayahCount}</span></p>
          </div>
        </div>

        {/* Process Button */}
        <div className="mb-6">
          <button
            onClick={handleProcess}
            disabled={!audioFile || state.status === "uploading" || state.status === "processing"}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-muted disabled:to-muted text-white font-bold py-4 rounded-xl transition-all active:scale-95"
          >
            {state.status === "uploading" && "📤 جاري الرفع..."}
            {state.status === "processing" && "⏳ جاري المعالجة..."}
            {(state.status === "idle" || state.status === "completed" || state.status === "error") && "🚀 معالجة الصوت"}
          </button>

          {/* Progress Bar */}
          {state.status !== "idle" && (
            <div className="mt-4">
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full transition-all duration-300"
                  style={{ width: `${state.progress}%` }}
                />
              </div>
              <p className="text-muted-foreground text-sm mt-2 text-center">{state.progress}%</p>
            </div>
          )}
        </div>

        {/* Error Message */}
        {state.status === "error" && (
          <div className="bg-destructive/15 border border-destructive/40 rounded-xl p-4 flex items-start gap-3 mb-6">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-destructive font-bold">❌ خطأ</p>
              <p className="text-destructive text-sm mt-1">{state.error}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {state.status === "completed" && (
          <div className="bg-success/10 border border-success/40 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <span className="text-success font-bold">✅ تمت المعالجة بنجاح!</span>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
              <div>
                <p className="text-muted-foreground">المدة</p>
                <p className="text-success font-bold">{state.duration?.toFixed(1)}s</p>
              </div>
              <div>
                <p className="text-muted-foreground">وقت المعالجة</p>
                <p className="text-success font-bold">{state.processingTime}ms</p>
              </div>
              <div>
                <p className="text-muted-foreground">المقاطع</p>
                <p className="text-success font-bold">{state.segments.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results Table */}
        {state.segments.length > 0 && (
          <div className="card-nour rounded-xl shadow-soft overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-secondary/50">
              <h3 className="text-foreground font-bold flex items-center gap-2">
                <Play className="w-4 h-4" />
                المقاطع ({state.segments.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="px-6 py-3 text-right text-xs font-bold text-muted-foreground">الآية</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-muted-foreground">المتحدث</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-muted-foreground">البداية (ث)</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-muted-foreground">النهاية (ث)</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-muted-foreground">المدة (ث)</th>
                  </tr>
                </thead>
                <tbody>
                  {state.segments.map((seg, i) => (
                    <tr key={i} className="border-b border-border hover:bg-secondary/30">
                      <td className="px-6 py-3 text-muted-foreground">
                        {seg.ayah ? `آية ${seg.ayah}` : "-"}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${
                            seg.speaker === "teacher"
                              ? "bg-amber-600/20 text-amber-300"
                              : "bg-sky-600/20 text-sky-300"
                          }`}
                        >
                          {seg.speaker === "teacher" ? "🎙️ معلم" : "👶 أطفال"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground font-mono">{seg.start.toFixed(2)}</td>
                      <td className="px-6 py-3 text-muted-foreground font-mono">{seg.end.toFixed(2)}</td>
                      <td className="px-6 py-3 text-muted-foreground font-mono">{(seg.end - seg.start).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AudioUploadPage;
