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
  const [fullSurahMode, setFullSurahMode] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const repetitionRef = useRef(0);
  const fullSurahRef = useRef(false);

  const surah = surahs.find((s) => s.number === selectedSurah);
  const ayahCount = surah?.ayahCount ?? 0;

  const buildAudioUrl = useCallback((surahNum: number, ayahNum: number, mode: "teacher" | "kids") => {
    const folder = mode === "teacher" ? "teacher" : "kids";
    return `/audio/${folder}/${surahNum}_${ayahNum}.mp3`;
  }, []);

  const buildFallbackUrl = useCallback((surahNum: number, ayahNum: number, mode: "teacher" | "kids") => {
    let absoluteAyah = 0;
    for (const s of surahs) {
      if (s.number < surahNum) {
        absoluteAyah += s.ayahCount;
      } else break;
    }
    absoluteAyah += ayahNum;
    const reciter = mode === "teacher" ? "ar.alafasy" : "ar.husary";
    return `https://cdn.islamic.network/quran/audio/128/${reciter}/${absoluteAyah}.mp3`;
  }, []);

  const getAudioUrl = useCallback(() => {
    if (!selectedSurah || !selectedAyah) return null;
    return buildAudioUrl(selectedSurah, selectedAyah, voiceMode);
  }, [selectedSurah, selectedAyah, voiceMode, buildAudioUrl]);

  const getFallbackAudioUrl = useCallback(() => {
    if (!selectedSurah || !selectedAyah) return null;
    return buildFallbackUrl(selectedSurah, selectedAyah, voiceMode);
  }, [selectedSurah, selectedAyah, voiceMode, buildFallbackUrl]);

  const playAudio = useCallback((url: string, isFallback = false, onEnded?: () => void, fallbackUrl?: string | null) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.addEventListener("error", () => {
      if (!isFallback && fallbackUrl) {
        playAudio(fallbackUrl, true, onEnded, null);
        return;
      }
      setIsPlaying(false);
      setCurrentRepetition(0);
    });

    audio.addEventListener("timeupdate", () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    });

    audio.addEventListener("ended", () => {
      if (onEnded) {
        onEnded();
      }
    });

    audio.play();
    setIsPlaying(true);
  }, []);

  const playFullSurah = useCallback(() => {
    if (!selectedSurah) return;
    const totalAyahs = surahs.find(s => s.number === selectedSurah)?.ayahCount ?? 0;
    if (totalAyahs === 0) return;

    setFullSurahMode(true);
    fullSurahRef.current = true;
    setCurrentRepetition(0);

    const playAyahSequence = (ayahNum: number) => {
      if (!fullSurahRef.current || ayahNum > totalAyahs) {
        setIsPlaying(false);
        setProgress(0);
        setFullSurahMode(false);
        fullSurahRef.current = false;
        return;
      }

      setSelectedAyah(ayahNum);
      const url = buildAudioUrl(selectedSurah, ayahNum, voiceMode);
      const fallback = buildFallbackUrl(selectedSurah, ayahNum, voiceMode);

      setTimeout(() => {
        playAudio(url, false, () => {
          playAyahSequence(ayahNum + 1);
        }, fallback);
      }, 300);
    };

    playAyahSequence(1);
  }, [selectedSurah, voiceMode, buildAudioUrl, buildFallbackUrl, playAudio]);

  const handlePlay = () => {
    const url = getAudioUrl();
    if (!url) return;

    if (audioRef.current && !audioRef.current.paused && !audioRef.current.ended) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    repetitionRef.current = 0;
    setCurrentRepetition(1);

    const fallback = getFallbackAudioUrl();

    const handleRepeatEnd = () => {
      repetitionRef.current += 1;
      if (repetitionRef.current < repetitionCount) {
        setCurrentRepetition(repetitionRef.current + 1);
        setTimeout(() => playAudio(url, false, handleRepeatEnd, fallback), 500);
      } else {
        setIsPlaying(false);
        setProgress(0);
        setCurrentRepetition(0);
      }
    };

    playAudio(url, false, handleRepeatEnd, fallback);
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
    if (fullSurahMode) {
      setFullSurahMode(false);
      fullSurahRef.current = false;
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  useEffect(() => {
    setSelectedAyah(null);
    setFullSurahMode(false);
    fullSurahRef.current = false;
  }, [selectedSurah]);

  return (
    <div className="min-h-screen relative">
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/background-kids.jpg')" }}
      />
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" />

      <div className="relative z-10 min-h-screen">
        <AppHeader />

        <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          <SurahSelector
            selectedSurah={selectedSurah}
            selectedAyah={selectedAyah}
            ayahCount={ayahCount}
            onSurahChange={setSelectedSurah}
            onAyahChange={setSelectedAyah}
            fullSurahMode={fullSurahMode}
            onPlayFullSurah={playFullSurah}
            canPlayFull={!!selectedSurah && !isPlaying}
          />

          <AyahDisplay
            selectedSurah={selectedSurah}
            selectedAyah={selectedAyah}
          />

          <VoiceToggle voiceMode={voiceMode} onChange={setVoiceMode} />

          {!fullSurahMode && (
            <RepetitionController
              count={repetitionCount}
              onChange={setRepetitionCount}
            />
          )}

          <AudioPlayer
            isPlaying={isPlaying}
            progress={progress}
            currentRepetition={fullSurahMode ? 0 : currentRepetition}
            totalRepetitions={fullSurahMode ? 0 : repetitionCount}
            canPlay={fullSurahMode ? false : (!!selectedSurah && !!selectedAyah)}
            onPlayPause={handlePlay}
            onStop={handleStop}
            fullSurahMode={fullSurahMode}
            currentAyah={selectedAyah}
            totalAyahs={ayahCount}
          />
        </main>
      </div>
    </div>
  );
};

export default Index;
