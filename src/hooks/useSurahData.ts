import { useState, useEffect } from "react";
import { getSurahAudioUrl, isAudioAvailable } from "@/data/audioUrls";
import { surahs as allSurahNames } from "@/data/surahs";

interface HuggingFaceFile {
  path: string;
}

export interface SurahItem {
  number: number;
  name: string;
  audioSrc: string;
  ayahCount?: number;
  type?: "مكية" | "مدنية";
  revelationType?: string;
  englishName?: string;
  englishNameTranslation?: string;
  numberOfAyahs?: number;
  audioAvailable?: boolean; // هل الصوت متوفر لهذه السورة
}

// روابط السور المخصصة من السيرفر المحلي
export const LOCAL_SERVER_SURAHS: Record<number, string> = {
  // تم تعطيل السيرفر المحلي - استخدام Hugging Face مباشرة
  // 57: "http://localhost:12345/57.mp3",
  // يمكنك إضافة المزيد من السور هنا
  // 55: "http://localhost:12345/55.mp3",
  // 56: "http://localhost:12345/56.mp3",
};

// دالة التحقق من توفر السيرفر المحلي
async function isLocalServerAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const response = await fetch("http://localhost:12345/health", { 
      signal: controller.signal,
      method: "HEAD"
    });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

// دالة تحديد الرابط الصوتي للسورة
function getAudioForSurah(n: number): string {
  const legacyAmmaMap: Record<number, number> = {
    78: 38, 79: 37, 80: 36, 81: 35, 82: 34, 83: 33, 84: 32, 85: 31,
    86: 30, 87: 29, 88: 28, 89: 27, 90: 26, 91: 25, 92: 24, 93: 23,
    94: 22, 95: 21, 96: 20, 97: 19, 98: 18, 99: 17, 100: 16, 101: 15,
    102: 14, 103: 13, 104: 12, 105: 11, 106: 10, 107: 9, 108: 8, 109: 7,
    110: 6, 111: 5, 112: 4, 113: 3, 114: 2
  };
  if (legacyAmmaMap[n]) {
    return getSurahAudioUrl(legacyAmmaMap[n]);
  }
  return getSurahAudioUrl(n);
}

// دالة الحصول على رابط السورة (مع fallback)
async function getSurahAudioSrc(n: number): Promise<string> {
  // تحقق إذا كانت السورة مخصصة للسيرفر المحلي
  if (LOCAL_SERVER_SURAHS[n]) {
    const localAvailable = await isLocalServerAvailable();
    if (localAvailable) {
      return LOCAL_SERVER_SURAHS[n];
    }
    console.warn(`السيرفر المحلي غير متاح، استخدام Hugging Face للسورة ${n}`);
  }
  return getAudioForSurah(n);
}

// ربع يس فقط (الفاتحة 1، ومن يس 36 إلى الناس 114)
const BASE_SURAHS: SurahItem[] = allSurahNames
  .filter((s) => (s.number === 1 || (s.number >= 36 && s.number <= 114)))
  .filter((s) => isAudioAvailable(s.number)) // استبعاد السور التي لا يتوفر لها صوت
  .map((s) => ({
    number: s.number,
    name: s.name,
    ayahCount: s.ayahCount,
    type: s.type,
    audioSrc: getAudioForSurah(s.number),
    audioAvailable: true,
  }));

// قائمة السور المحلية (يتم تحديثها عند التحقق من السيرفر المحلي)
let LOCAL_SURAHS: SurahItem[] = BASE_SURAHS;

const HF_CACHE_KEY = "mushaf:hf-surahs-cache-v5";
const HF_CACHE_TTL = 1000 * 60 * 60; // ساعة واحدة

export function useSurahData() {
  const [surahs, setSurahs] = useState<SurahItem[]>(LOCAL_SURAHS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSurahs = async () => {
    setLoading(true);
    setError(null);
    try {
      // التحقق من توفر السيرفر المحلي وتحديث الروابط
      if (Object.keys(LOCAL_SERVER_SURAHS).length > 0) {
        const localAvailable = await isLocalServerAvailable();
        if (localAvailable) {
          // تحديث روابط السور المحلية
          LOCAL_SURAHS = BASE_SURAHS.map(s => {
            if (LOCAL_SERVER_SURAHS[s.number]) {
              return { ...s, audioSrc: LOCAL_SERVER_SURAHS[s.number] };
            }
            return s;
          });
          console.log("[Local Server] السيرفر المحلي متاح، تم تحديث روابط السور");
        } else {
          console.warn("[Local Server] السيرفر المحلي غير متاح، استخدام Hugging Face");
          LOCAL_SURAHS = BASE_SURAHS;
        }
      }

      // محاولة قراءة النتيجة المخزّنة أولاً
      let serverSurahNumbers: number[] = [];
      let usedCache = false;
      try {
        const cached = localStorage.getItem(HF_CACHE_KEY);
        if (cached) {
          const { data, ts } = JSON.parse(cached);
          if (Date.now() - ts < HF_CACHE_TTL) {
            serverSurahNumbers = data;
            usedCache = true;
          }
        }
      } catch { /* ignore */ }

      if (!usedCache) {
        // جلب قائمة الملفات من Hugging Face مباشرة
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const response = await fetch("https://huggingface.co/api/datasets/hammoualiyoucef20/quran-audio/tree/main", { signal: controller.signal });
        clearTimeout(timeout);
        if (!response.ok) throw new Error("فشل الاتصال بـ Hugging Face");

        const data = await response.json();

        // استخراج أرقام السور (ربع يس فقط)
        serverSurahNumbers = (data as HuggingFaceFile[])
          .filter((file) => file.path.endsWith('.mp3'))
          .map((file) => {
            const nameWithoutExt = file.path.replace(/\.[^/.]+$/, "");
            const num = parseInt(nameWithoutExt, 10);
            return isNaN(num) ? null : num;
          })
          .filter((num: number | null): num is number => 
            num !== null && (num === 1 || (num >= 36 && num <= 114))
          );

        // حفظ النتيجة في localStorage للمرّات القادمة
        try {
          localStorage.setItem(HF_CACHE_KEY, JSON.stringify({ data: serverSurahNumbers, ts: Date.now() }));
        } catch { /* ignore */ }
      }

      // قراءة الأرقام المضافة يدوياً من الإعدادات
      let manualSurahs: number[] = [];
      try {
        const stored = localStorage.getItem('MANUAL_SURAHS');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            manualSurahs = parsed.filter((n): n is number => typeof n === 'number');
          }
        }
      } catch {
        console.warn('Failed to parse MANUAL_SURAHS from localStorage');
      }

      // دمج السور المحلية المضمنة مع المكتشفة من السيرفر والمضافة يدوياً
      const uniqueNumbers = Array.from(
        new Set([...LOCAL_SURAHS.map((s) => s.number), ...serverSurahNumbers, ...manualSurahs])
      ).filter(n => (n === 1 || (n >= 36 && n <= 114)) )
       .sort((a, b) => {
         if (a === 1) return -1;
         if (b === 1) return 1;
         return a - b;
       });

      const mergedSurahs = uniqueNumbers.map((num) => {
        // التحقق من وجود السورة محلياً أولاً
        const localMatch = LOCAL_SURAHS.find((s) => s.number === num);
        if (localMatch) return localMatch;

        // البحث عن الاسم وعدد الآيات ونوع السورة في القائمة العامة لـ 114 سورة
        const globalMatch = allSurahNames.find((s) => s.number === num);
        const name = globalMatch ? globalMatch.name : `سورة ${num}`;
        const ayahCount = globalMatch ? globalMatch.ayahCount : undefined;
        const type = globalMatch ? globalMatch.type : undefined;

        return {
          number: num,
          name,
          ayahCount,
          type,
          audioSrc: LOCAL_SERVER_SURAHS[num] || getAudioForSurah(num),
          audioAvailable: isAudioAvailable(num),
        };
      });

      setSurahs(mergedSurahs);
    } catch {
      // Fallback silently to local surahs if offline
      let manualSurahs: number[] = [];
      try {
        const stored = localStorage.getItem('MANUAL_SURAHS');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            manualSurahs = parsed.filter((n): n is number => typeof n === 'number');
          }
        }
      } catch {
        console.warn('Failed to parse MANUAL_SURAHS from localStorage');
      }

      const uniqueNumbers = Array.from(
        new Set([...LOCAL_SURAHS.map((s) => s.number), ...manualSurahs])
      ).filter(n => (n === 1 || (n >= 36 && n <= 114)) )
       .sort((a, b) => {
         if (a === 1) return -1;
         if (b === 1) return 1;
         return a - b;
       });

      const fallbackSurahs = uniqueNumbers.map((num) => {
        const localMatch = LOCAL_SURAHS.find((s) => s.number === num);
        if (localMatch) return localMatch;
        const globalMatch = allSurahNames.find((s) => s.number === num);
        return {
          number: num,
          name: globalMatch ? globalMatch.name : `سورة ${num}`,
          ayahCount: globalMatch ? globalMatch.ayahCount : undefined,
          type: globalMatch ? globalMatch.type : undefined,
          audioSrc: LOCAL_SERVER_SURAHS[num] || getAudioForSurah(num),
          audioAvailable: isAudioAvailable(num),
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



