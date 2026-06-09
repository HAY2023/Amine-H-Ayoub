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
  const [surahs, setSurahs] = useState<SurahItem[]>(LOCAL_SURAHS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSurahs = async () => {
    setLoading(true);
    setError(null);
    try {
      // جلب قائمة الملفات من المجلد surahs في الحاوية quran-audio
      const { data, error: storageError } = await supabase.storage
        .from("quran-audio")
        .list("surahs", {
          limit: 100,
          offset: 0,
          sortBy: { column: "name", order: "asc" }
        });

      if (storageError) {
        console.warn("Could not load surahs from cloud storage, using local backup:", storageError.message);
        setSurahs(LOCAL_SURAHS);
        return;
      }

      if (data && data.length > 0) {
        // استخراج أرقام السور من أسماء الملفات مثل 1.mp3، 2.mp3، إلخ.
        const serverSurahNumbers = data
          .map((file) => {
            const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
            const num = parseInt(nameWithoutExt, 10);
            return isNaN(num) ? null : num;
          })
          .filter((num): num is number => num !== null);

        // دمج السور المحلية المضمنة مع تلك المكتشفة حديثاً من السيرفر
        const uniqueNumbers = Array.from(
          new Set([...LOCAL_SURAHS.map((s) => s.number), ...serverSurahNumbers])
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
      } else {
        setSurahs(LOCAL_SURAHS);
      }
    } catch (err) {
      console.error("Error loading surahs:", err);
      // لا نعرض خطأ للمستخدم إذا كان أوفلاين، بل نستخدم النسخة المحلية بصمت
      setSurahs(LOCAL_SURAHS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSurahs();
  }, []);

  return { surahs, loading, error, retry: fetchSurahs };
}
