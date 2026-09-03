import { useState, useCallback, useEffect } from "react";
import { getCoins, setCoins, addCoins } from "@/data/kidsProfile";

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
    if (!raw) return { points: getCoins(), listenedAyahs: {} };
    const parsed: SerializedData = JSON.parse(raw);
    const listenedAyahs: Record<string, Set<number>> = {};
    for (const [key, arr] of Object.entries(parsed.listenedAyahs || {})) {
      listenedAyahs[key] = new Set(arr);
    }

    // مزامنة فورية: ما يوجد في الواجهة من نجوم (points) ينتقل مباشرة إلى حساب الطفل في ركن الأطفال
    if (typeof parsed.points === "number") {
      const alreadySynced = localStorage.getItem("mushaf:interface_stars_synced_v3");
      if (!alreadySynced) {
        try { localStorage.setItem("mushaf:interface_stars_synced_v3", "1"); } catch { /* ignore */ }
        setCoins(parsed.points);
      }
    }

    return { points: getCoins(), listenedAyahs };
  } catch {
    return { points: getCoins(), listenedAyahs: {} };
  }
}

function saveProgress(data: ProgressData) {
  const serialized: SerializedData = {
    points: getCoins(),
    listenedAyahs: {},
  };
  for (const [key, set] of Object.entries(data.listenedAyahs)) {
    serialized.listenedAyahs[key] = Array.from(set);
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  } catch { /* ignore */ }
}

export type Level = "القارئ الناشئ" | "القارئ الماهر" | "القارئ المتقن";

export function getLevel(points: number): Level {
  if (points > 500) return "القارئ المتقن";
  if (points > 100) return "القارئ الماهر";
  return "القارئ الناشئ";
}

export function useProgress() {
  const [coins, setCoinsState] = useState<number>(getCoins);
  const [data, setData] = useState<ProgressData>(loadProgress);

  useEffect(() => {
    const sync = () => {
      const current = getCoins();
      setCoinsState(current);
      setData((prev) => ({ ...prev, points: current }));
    };
    sync();
    window.addEventListener("mushaf:coins", sync);
    window.addEventListener("mushaf:activeprofile", sync);
    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("mushaf:coins", sync);
      window.removeEventListener("mushaf:activeprofile", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

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
        points: getCoins() + 10,
        listenedAyahs: { ...prev.listenedAyahs, [key]: updated },
      };
    });
    // إضافة 10 نجوم إلى حساب الطفل الموحّد فورياً
    addCoins(10);
    return { newPoints: true, newAyah };
  }, []);

  const getListenedCount = useCallback((surahNumber: number): number => {
    return data.listenedAyahs[String(surahNumber)]?.size ?? 0;
  }, [data.listenedAyahs]);

  const isSurahComplete = useCallback((surahNumber: number, totalAyahs: number): boolean => {
    return getListenedCount(surahNumber) >= totalAyahs;
  }, [getListenedCount]);

  return {
    points: coins,
    level: getLevel(coins),
    recordAyah,
    getListenedCount,
    isSurahComplete,
  };
}
