import { useState, useCallback, useEffect } from "react";

interface ProgressData {
  points: number;
  listenedAyahs: Record<string, Set<number>>; // surahNumber -> Set of ayah numbers
}

interface SerializedData {
  points: number;
  listenedAyahs: Record<string, number[]>;
}

const STORAGE_KEY = "quran-progress";

function loadProgress(): ProgressData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { points: 0, listenedAyahs: {} };
    const parsed: SerializedData = JSON.parse(raw);
    const listenedAyahs: Record<string, Set<number>> = {};
    for (const [key, arr] of Object.entries(parsed.listenedAyahs)) {
      listenedAyahs[key] = new Set(arr);
    }
    return { points: parsed.points, listenedAyahs };
  } catch {
    return { points: 0, listenedAyahs: {} };
  }
}

function saveProgress(data: ProgressData) {
  const serialized: SerializedData = {
    points: data.points,
    listenedAyahs: {},
  };
  for (const [key, set] of Object.entries(data.listenedAyahs)) {
    serialized.listenedAyahs[key] = Array.from(set);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
}

export type Level = "القارئ الناشئ" | "القارئ الماهر" | "القارئ المتقن";

export function getLevel(points: number): Level {
  if (points > 500) return "القارئ المتقن";
  if (points > 100) return "القارئ الماهر";
  return "القارئ الناشئ";
}

export function useProgress() {
  const [data, setData] = useState<ProgressData>(loadProgress);

  useEffect(() => {
    saveProgress(data);
  }, [data]);

  const recordAyah = useCallback((surahNumber: number, ayahNumber: number): { newPoints: boolean; newAyah: boolean } => {
    let newAyah = false;
    setData((prev) => {
      const key = String(surahNumber);
      const existing = prev.listenedAyahs[key] ?? new Set<number>();
      newAyah = !existing.has(ayahNumber);
      const updated = new Set(existing);
      updated.add(ayahNumber);
      return {
        points: prev.points + 10,
        listenedAyahs: { ...prev.listenedAyahs, [key]: updated },
      };
    });
    return { newPoints: true, newAyah };
  }, []);

  const getListenedCount = useCallback((surahNumber: number): number => {
    return data.listenedAyahs[String(surahNumber)]?.size ?? 0;
  }, [data.listenedAyahs]);

  const isSurahComplete = useCallback((surahNumber: number, totalAyahs: number): boolean => {
    return getListenedCount(surahNumber) >= totalAyahs;
  }, [getListenedCount]);

  return {
    points: data.points,
    level: getLevel(data.points),
    recordAyah,
    getListenedCount,
    isSurahComplete,
  };
}
