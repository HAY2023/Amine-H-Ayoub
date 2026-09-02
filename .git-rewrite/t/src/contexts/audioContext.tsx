import { createContext, useContext, useCallback, useRef, useState, type ReactNode } from "react";

/**
 * مصادر الصوت المختلفة في التطبيق
 * - mushaf: مشغل المصحف (QuranReader)
 * - audio-list: مشغل قائمة التلاوات (Index / CustomPlayer)
 */
export type AudioSource = "mushaf" | "audio-list";

interface AudioContextType {
  /**
   * يُستدعى عندما يريد مصدر ما بدء التشغيل.
   * يُوقف أي مصدر آخر يعمل حالياً.
   */
  requestPlay: (source: AudioSource, audioElement: HTMLAudioElement) => void;

  /**
   * يُستدعى عندما يتوقف مصدر عن التشغيل.
   */
  notifyStop: (source: AudioSource) => void;

  /**
   * تسجيل عنصر صوت لمصدر معين حتى يمكن إيقافه عن بُعد.
   */
  registerAudio: (source: AudioSource, audioElement: HTMLAudioElement) => void;

  /**
   * إلغاء تسجيل عنصر صوت.
   */
  unregisterAudio: (source: AudioSource) => void;

  /** المصدر النشط حالياً (أو null إذا لا يوجد تشغيل) */
  activeSource: AudioSource | null;

  /** وضع التشغيل المتزامن (المعلم والطفل معاً) */
  simultaneousMode: boolean;
  setSimultaneousMode: (v: boolean) => void;
}

const AudioCtx = createContext<AudioContextType | null>(null);

export function AudioContextProvider({ children }: { children: ReactNode }) {
  const [activeSource, setActiveSource] = useState<AudioSource | null>(null);
  const [simultaneousMode, setSimultaneousMode] = useState(false);

  // خريطة المشغلات المسجلة: المصدر → عنصر الصوت
  const registeredAudios = useRef<Map<AudioSource, HTMLAudioElement>>(new Map());

  const registerAudio = useCallback((source: AudioSource, audioElement: HTMLAudioElement) => {
    registeredAudios.current.set(source, audioElement);
  }, []);

  const unregisterAudio = useCallback((source: AudioSource) => {
    registeredAudios.current.delete(source);
  }, []);

  const requestPlay = useCallback((source: AudioSource, _audioElement: HTMLAudioElement) => {
    // إيقاف أي مصدر آخر يعمل
    registeredAudios.current.forEach((audio, registeredSource) => {
      if (registeredSource !== source && !audio.paused) {
        audio.pause();
      }
    });
    setActiveSource(source);
  }, []);

  const notifyStop = useCallback((source: AudioSource) => {
    setActiveSource(prev => (prev === source ? null : prev));
  }, []);

  return (
    <AudioCtx.Provider
      value={{
        requestPlay,
        notifyStop,
        registerAudio,
        unregisterAudio,
        activeSource,
        simultaneousMode,
        setSimultaneousMode,
      }}
    >
      {children}
    </AudioCtx.Provider>
  );
}

/**
 * Hook لاستخدام AudioContext من أي مكون.
 */
export function useAudioContext(): AudioContextType {
  const ctx = useContext(AudioCtx);
  if (!ctx) {
    throw new Error("useAudioContext must be used within AudioContextProvider");
  }
  return ctx;
}
