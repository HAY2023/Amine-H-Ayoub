import { useState, useRef, useCallback, useEffect } from "react";
import { surahs } from "@/data/surahs";
import AppHeader from "@/components/AppHeader";
import SurahSelector from "@/components/SurahSelector";
import VoiceToggle from "@/components/VoiceToggle";
import RepetitionController from "@/components/RepetitionController";
import AudioPlayer from "@/components/AudioPlayer";
import AyahDisplay from "@/components/AyahDisplay";

const Index = () => {
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [selectedAyah, setSelectedAyah] = useState<number | null>(null);
  const [voiceMode, setVoiceMode] = useState<"teacher" | "kids">("teacher");
  const [repetitionCount, setRepetitionCount] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentRepetition, setCurrentRepetition] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const repetitionRef = useRef(0);

  const surah = surahs.find((s) => s.number === selectedSurah);
  const ayahCount = surah?.ayahCount ?? 0;

  const getAudioUrl = useCallback(() => {
    if (!selectedSurah || !selectedAyah) return null;
    const surahStr = String(selectedSurah).padStart(3, "0");
    const ayahStr = String(selectedAyah).padStart(3, "0");
    // Using Alafasy (teacher) or Husary with kids based on voice mode
    const reciter = voiceMode === "teacher" ? "ar.alafasy" : "ar.husary";
    return `https://cdn.islamic.network/quran/audio/128/${reciter}/${surahStr}${ayahStr}.mp3`;
  }, [selectedSurah, selectedAyah, voiceMode]);

  // Alternative simpler audio URL using verse key
  const getAudioUrlSimple = useCallback(() => {
    if (!selectedSurah || !selectedAyah) return null;
    // Calculate absolute ayah number
    let absoluteAyah = 0;
    for (const s of surahs) {
      if (s.number < selectedSurah) {
        absoluteAyah += s.ayahCount;
      } else break;
    }
    absoluteAyah += selectedAyah;
    const reciter = voiceMode === "teacher" ? "ar.alafasy" : "ar.husary";
    return `https://cdn.islamic.network/quran/audio/128/${reciter}/${absoluteAyah}.mp3`;
  }, [selectedSurah, selectedAyah, voiceMode]);

  const handlePlay = () => {
    const url = getAudioUrlSimple();
    if (!url) return;

    if (audioRef.current && !audioRef.current.paused && !audioRef.current.ended) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    repetitionRef.current = 0;
    setCurrentRepetition(1);
    playAudio(url);
  };

  const playAudio = (url: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.addEventListener("timeupdate", () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    });

    audio.addEventListener("ended", () => {
      repetitionRef.current += 1;
      if (repetitionRef.current < repetitionCount) {
        setCurrentRepetition(repetitionRef.current + 1);
        setTimeout(() => playAudio(url), 500);
      } else {
        setIsPlaying(false);
        setProgress(0);
        setCurrentRepetition(0);
      }
    });

    audio.play();
    setIsPlaying(true);
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setProgress(0);
    setCurrentRepetition(0);
    repetitionRef.current = 0;
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Reset ayah when surah changes
  useEffect(() => {
    setSelectedAyah(null);
  }, [selectedSurah]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <SurahSelector
          selectedSurah={selectedSurah}
          selectedAyah={selectedAyah}
          ayahCount={ayahCount}
          onSurahChange={setSelectedSurah}
          onAyahChange={setSelectedAyah}
        />

        <AyahDisplay
          selectedSurah={selectedSurah}
          selectedAyah={selectedAyah}
        />

        <VoiceToggle voiceMode={voiceMode} onChange={setVoiceMode} />

        <RepetitionController
          count={repetitionCount}
          onChange={setRepetitionCount}
        />

        <AudioPlayer
          isPlaying={isPlaying}
          progress={progress}
          currentRepetition={currentRepetition}
          totalRepetitions={repetitionCount}
          canPlay={!!selectedSurah && !!selectedAyah}
          onPlayPause={handlePlay}
          onStop={handleStop}
        />
      </main>
    </div>
  );
};

export default Index;
