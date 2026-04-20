import { useState } from "react";
import { getSurahAudioUrl, hasCloudAudio } from "@/data/audioUrls";

export interface SurahItem {
  number: number;
  name: string;
  audioSrc: string;
}

// تستخدم الروابط السحابية إن توفّرت، وتقع على الملفات المحلية كاحتياط
const url = (n: number) => (hasCloudAudio(n) ? getSurahAudioUrl(n) : `/audio/surahs/${n}.mp3`);

const LOCAL_SURAHS: SurahItem[] = [
  { number: 1,  name: "الفاتحة",   audioSrc: url(1)  },
  { number: 2,  name: "الناس",     audioSrc: url(2)  },
  { number: 3,  name: "الفلق",     audioSrc: url(3)  },
  { number: 4,  name: "الإخلاص",   audioSrc: url(4)  },
  { number: 5,  name: "المسد",     audioSrc: url(5)  },
  { number: 6,  name: "النصر",     audioSrc: url(6)  },
  { number: 7,  name: "الكافرون",  audioSrc: url(7)  },
  { number: 8,  name: "الكوثر",    audioSrc: url(8)  },
  { number: 9,  name: "الماعون",   audioSrc: url(9)  },
  { number: 10, name: "قريش",      audioSrc: url(10) },
  { number: 11, name: "الفيل",     audioSrc: url(11) },
  { number: 12, name: "الهمزة",    audioSrc: url(12) },
  { number: 13, name: "العصر",     audioSrc: url(13) },
  { number: 14, name: "التكاثر",   audioSrc: url(14) },
];

export function useSurahData() {
  const [surahs] = useState<SurahItem[]>(LOCAL_SURAHS);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  return { surahs, loading, error, retry: () => {} };
}
