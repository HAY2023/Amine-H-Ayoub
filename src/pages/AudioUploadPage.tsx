import React, { useState, useRef, useCallback } from "react";
import { Upload, Play, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { useAudioSegmentation } from "../hooks/useAudioSegmentation";

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
  const [file, setFile] = useState<File | null>(null);
  const [surahNumber, setSurahNumber] = useState<number>(1);
  const [ayahCount, setAyahCount] = useState<number>(7);
  const [state, setState] = useState<ProcessingState>({ status: "idle", progress: 0, segments: [] });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { processAudio } = useAudioSegmentation();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];
      if (!["audio/mpeg", "audio/wav", "audio/mp3"].includes(selectedFile.type)) {
        setState(prev => ({ ...prev, status: "error", error: "Only MP3/WAV files are supported" }));
        return;
      }
      setFile(selectedFile);
      setState({ status: "idle", progress: 0, segments: [] });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add("border-blue-500", "bg-blue-50");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("border-blue-500", "bg-blue-50");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove("border-blue-500", "bg-blue-50");
    if (e.dataTransfer.files?.[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleProcess = useCallback(async () => {
    if (!file) {
      setState(prev => ({ ...prev, status: "error", error: "Please select an audio file" }));
      return;
    }

    setState(prev => ({ ...prev, status: "uploading", progress: 10 }));

    try {
      // Upload to Supabase Storage
      const sessionId = `session_${Date.now()}`;
      const filename = `${sessionId}_${file.name}`;
      const filepath = `audio-uploads/${sessionId}/${filename}`;

      console.log("Uploading file to Storage...");
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("quran-audio")
        .upload(filepath, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      setState(prev => ({ ...prev, progress: 30 }));

      // Get signed URL
      const { data: urlData } = supabase.storage
        .from("quran-audio")
        .getPublicUrl(filepath);

      const storageUrl = urlData?.publicUrl;
      if (!storageUrl) {
        throw new Error("Failed to get storage URL");
      }

      console.log("Calling process-audio function...");
      setState(prev => ({ ...prev, status: "processing", progress: 40 }));

      // Call Edge Function
      const result = await processAudio({
        storageUrl,
        surahNumber,
        ayahCount,
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

      console.log("✅ Processing complete!", result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("❌ Error:", message);
      setState(prev => ({
        ...prev,
        status: "error",
        error: message,
        progress: 0,
      }));
    }
  }, [file, surahNumber, ayahCount, processAudio]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">🎙️ Audio Segmentation</h1>
          <p className="text-slate-400">Upload a Quranic audio file to automatically segment ayahs and identify speakers</p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-xl overflow-hidden">
          {/* Upload Area */}
          <div
            className="p-8 border-2 border-dashed border-slate-600 rounded-lg m-6 transition-all hover:border-blue-500 hover:bg-slate-700/50 cursor-pointer"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="text-center">
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-white font-medium mb-2">Drop audio file here or click to browse</p>
              <p className="text-slate-400 text-sm">Supports MP3, WAV (max 50MB)</p>
              {file && <p className="text-blue-400 mt-4">📁 {file.name}</p>}
            </div>
          </div>

          {/* Configuration */}
          <div className="px-6 pb-6 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Surah Number</label>
              <input
                type="number"
                min={1}
                max={114}
                value={surahNumber}
                onChange={e => setSurahNumber(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Ayah Count</label>
              <input
                type="number"
                min={1}
                max={286}
                value={ayahCount}
                onChange={e => setAyahCount(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Process Button */}
          <div className="px-6 pb-6">
            <button
              onClick={handleProcess}
              disabled={!file || state.status === "uploading" || state.status === "processing"}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-3 rounded-lg transition-all"
            >
              {state.status === "uploading" && "Uploading..."}
              {state.status === "processing" && "Processing..."}
              {(state.status === "idle" || state.status === "completed" || state.status === "error") && "Process Audio"}
            </button>

            {/* Progress Bar */}
            {state.status !== "idle" && (
              <div className="mt-4">
                <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full transition-all duration-300"
                    style={{ width: `${state.progress}%` }}
                  />
                </div>
                <p className="text-slate-400 text-sm mt-2">{state.progress}%</p>
              </div>
            )}
          </div>
        </div>

        {/* Status Messages */}
        {state.status === "error" && (
          <div className="mt-6 bg-red-900/30 border border-red-700 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-medium">Error</p>
              <p className="text-red-300 text-sm mt-1">{state.error}</p>
            </div>
          </div>
        )}

        {state.status === "completed" && (
          <div className="mt-6 bg-green-900/30 border border-green-700 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-medium">Processing Complete!</span>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
              <div>
                <p className="text-slate-400">Duration</p>
                <p className="text-green-400 font-medium">{state.duration?.toFixed(1)}s</p>
              </div>
              <div>
                <p className="text-slate-400">Processing Time</p>
                <p className="text-green-400 font-medium">{state.processingTime}ms</p>
              </div>
              <div>
                <p className="text-slate-400">Segments</p>
                <p className="text-green-400 font-medium">{state.segments.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results Table */}
        {state.segments.length > 0 && (
          <div className="mt-6 bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700 bg-slate-700/50">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Play className="w-4 h-4" />
                Segments ({state.segments.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-700/50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Ayah</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Speaker</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Start (s)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">End (s)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Duration (s)</th>
                  </tr>
                </thead>
                <tbody>
                  {state.segments.map((seg, i) => (
                    <tr key={i} className="border-b border-slate-700 hover:bg-slate-700/30">
                      <td className="px-6 py-3 text-slate-300">
                        {seg.ayah ? `Ayah ${seg.ayah}` : "-"}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            seg.speaker === "teacher"
                              ? "bg-blue-500/20 text-blue-300"
                              : "bg-green-500/20 text-green-300"
                          }`}
                        >
                          {seg.speaker}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-slate-300">{seg.start.toFixed(2)}</td>
                      <td className="px-6 py-3 text-slate-300">{seg.end.toFixed(2)}</td>
                      <td className="px-6 py-3 text-slate-300">{(seg.end - seg.start).toFixed(2)}</td>
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
