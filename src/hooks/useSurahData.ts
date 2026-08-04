import { useState, useEffect } from "react";
import { getSurahAudioUrl, hasCloudAudio } from "@/data/audioUrls";
import { supabase } from "@/lib/supabase";
import { surahs as allSurahNames } from "@/data/surahs";

export interface SurahItem {
  number: number;
  name: string;
  audioSrc: string;
}

// تستخدم الروابط السحابية إن توفّرت، وتقع على الملفات المحلية كاحتياط
const url = (n: number) => (hasCloudAudio(n) ? getSurahAudioUrl(n) : `/audio/surahs/${n}.mp3`);

const LOCAL_SURAHS: SurahItem[] = [
  { number: 1,   name: "الفاتحة",   audioSrc: url(1)  },
  { number: 78,  name: "النبأ",     audioSrc: url(38) },
  { number: 79,  name: "النازعات",  audioSrc: url(37) },
  { number: 80,  name: "عبس",       audioSrc: url(36) },
  { number: 81,  name: "التكوير",   audioSrc: url(35) },
  { number: 82,  name: "الانفطار",  audioSrc: url(34) },
  { number: 83,  name: "المطففين",  audioSrc: url(33) },
  { number: 84,  name: "الانشقاق",  audioSrc: url(32) },
  { number: 85,  name: "البروج",    audioSrc: url(31) },
  { number: 86,  name: "الطارق",    audioSrc: url(30) },
  { number: 87,  name: "الأعلى",    audioSrc: url(29) },
  { number: 88,  name: "الغاشية",   audioSrc: url(28) },
  { number: 89,  name: "الفجر",     audioSrc: url(27) },
  { number: 90,  name: "البلد",     audioSrc: url(26) },
  { number: 91,  name: "الشمس",     audioSrc: url(25) },
  { number: 92,  name: "الليل",     audioSrc: url(24) },
  { number: 93,  name: "الضحى",     audioSrc: url(23) },
  { number: 94,  name: "الشرح",     audioSrc: url(22) },
  { number: 95,  name: "التين",     audioSrc: url(21) },
  { number: 96,  name: "العلق",     audioSrc: url(20) },
  { number: 97,  name: "القدر",     audioSrc: url(19) },
  { number: 98,  name: "البينة",    audioSrc: url(18) },
  { number: 99,  name: "الزلزلة",   audioSrc: url(17) },
  { number: 100, name: "العاديات",  audioSrc: url(16) },
  { number: 101, name: "القارعة",   audioSrc: url(15) },
  { number: 102, name: "التكاثر",   audioSrc: url(14) },
  { number: 103, name: "العصر",     audioSrc: url(13) },
  { number: 104, name: "الهمزة",    audioSrc: url(12) },
  { number: 105, name: "الفيل",     audioSrc: url(11) },
  { number: 106, name: "قريش",      audioSrc: url(10) },
  { number: 107, name: "الماعون",   audioSrc: url(9)  },
  { number: 108, name: "الكوثر",    audioSrc: url(8)  },
  { number: 109, name: "الكافرون",  audioSrc: url(7)  },
  { number: 110, name: "النصر",     audioSrc: url(6)  },
  { number: 111, name: "المسد",     audioSrc: url(5)  },
  { number: 112, name: "الإخلاص",   audioSrc: url(4)  },
  { number: 113, name: "الفلق",     audioSrc: url(3)  },
  { number: 114, name: "الناس",     audioSrc: url(2)  },
];

export function useSurahData() {
  const [surahs, setSurahs] = useState<SurahItem[]>(LOCAL_SURAHS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSurahs = async () => {
    setLoading(true);
    setError(null);
    try {
      // جلب قائمة الملفات من Hugging Face مباشرة
      const response = await fetch("https://huggingface.co/api/datasets/hammoualiyoucef20/quran-audio/tree/main");
      if (!response.ok) throw new Error("فشل الاتصال بـ Hugging Face");

      const data = await response.json();

      // استخراج أرقام السور من أسماء الملفات مثل 1.mp3، 2.mp3، إلخ.
      const serverSurahNumbers = data
        .filter((file: any) => file.path.endsWith('.mp3'))
        .map((file: any) => {
          const nameWithoutExt = file.path.replace(/\.[^/.]+$/, "");
          const num = parseInt(nameWithoutExt, 10);
          return isNaN(num) ? null : num;
        })
        .filter((num: any): num is number => {
          // تجاهل الملفات القديمة التي تم رفعها بالترقيم القديم (من 2 إلى 77)
          // لأن رقم 4 قديماً كان سورة الإخلاص، ولكنه في المصحف هو سورة النساء!
          if (num !== null && num >= 2 && num <= 77) return false;
          return num !== null;
        });

      // قراءة الأرقام المضافة يدوياً من الإعدادات
      let manualSurahs: number[] = [];
      try {
        manualSurahs = JSON.parse(localStorage.getItem('MANUAL_SURAHS') || '[]');
      } catch (e) { }

      // دمج السور المحلية المضمنة مع المكتشفة من السيرفر والمضافة يدوياً
      const uniqueNumbers = Array.from(
        new Set([...LOCAL_SURAHS.map((s) => s.number), ...serverSurahNumbers, ...manualSurahs])
      ).sort((a, b) => a - b);

      const mergedSurahs = uniqueNumbers.map((num) => {
        // التحقق من وجود السورة محلياً أولاً
        const localMatch = LOCAL_SURAHS.find((s) => s.number === num);
        if (localMatch) return localMatch;

        // البحث عن الاسم في القائمة العامة لـ 114 سورة
        const globalMatch = allSurahNames.find((s) => s.number === num);
        const name = globalMatch ? globalMatch.name : `سورة ${num}`;

        return {
          number: num,
          name,
          audioSrc: getSurahAudioUrl(num)
        };
      });

      setSurahs(mergedSurahs);
    } catch (err) {
      console.error("Error loading surahs:", err);

      let manualSurahs: number[] = [];
      try {
        manualSurahs = JSON.parse(localStorage.getItem('MANUAL_SURAHS') || '[]');
      } catch (e) { }

      const uniqueNumbers = Array.from(
        new Set([...LOCAL_SURAHS.map((s) => s.number), ...manualSurahs])
      ).sort((a, b) => a - b);

      const fallbackSurahs = uniqueNumbers.map((num) => {
        const localMatch = LOCAL_SURAHS.find((s) => s.number === num);
        if (localMatch) return localMatch;
        const globalMatch = allSurahNames.find((s) => s.number === num);
        return {
          number: num,
          name: globalMatch ? globalMatch.name : `سورة ${num}`,
          audioSrc: getSurahAudioUrl(num)
        };
      });

      setSurahs(fallbackSurahs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSurahs();
  }, []);

  return { surahs, loading, error, retry: fetchSurahs };
}
