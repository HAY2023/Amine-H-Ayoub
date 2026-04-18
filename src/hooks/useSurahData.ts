import { useState, useEffect } from "react";

export interface SurahItem {
  number: number;
  name: string;
  audioSrc: string;
}

// Local surah data — matches the files in public/audio/surahs/
const LOCAL_SURAHS: SurahItem[] = [
  { number: 1,  name: "الفاتحة",   audioSrc: "/audio/surahs/1.mp3" },
  { number: 2,  name: "الناس",     audioSrc: "/audio/surahs/2.mp3" },
  { number: 3,  name: "الفلق",     audioSrc: "/audio/surahs/3.mp3" },
  { number: 4,  name: "الإخلاص",   audioSrc: "/audio/surahs/4.mp3" },
  { number: 5,  name: "المسد",     audioSrc: "/audio/surahs/5.mp3" },
  { number: 6,  name: "النصر",     audioSrc: "/audio/surahs/6.mp3" },
  { number: 7,  name: "الكافرون",  audioSrc: "/audio/surahs/7.mp3" },
  { number: 8,  name: "الكوثر",    audioSrc: "/audio/surahs/8.mp3" },
  { number: 9,  name: "الماعون",   audioSrc: "/audio/surahs/9.mp3" },
  { number: 10, name: "قريش",      audioSrc: "/audio/surahs/10.mp3" },
  { number: 11, name: "الفيل",     audioSrc: "/audio/surahs/11.mp3" },
  { number: 12, name: "الهمزة",    audioSrc: "/audio/surahs/12.mp3" },
  { number: 13, name: "العصر",     audioSrc: "/audio/surahs/13.mp3" },
  { number: 14, name: "التكاثر",   audioSrc: "/audio/surahs/14.mp3" },
];

export function useSurahData() {
  const [surahs] = useState<SurahItem[]>(LOCAL_SURAHS);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  return { surahs, loading, error, retry: () => {} };
}
