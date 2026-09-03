// روابط الملفات الصوتية على Lovable Cloud Storage / Hugging Face
// الترقيم في ملفات Hugging Face يتبع ترقيم مخصص (1=الفاتحة، 2=الناس، ... إلى 38=النبأ)
const BASE = "https://huggingface.co/datasets/hammoualiyoucef20/quran-audio/resolve/main";

export const LEGACY_AMMA_MAP: Record<number, number> = {
  1: 1, // الفاتحة
  78: 38, 79: 37, 80: 36, 81: 35, 82: 34, 83: 33, 84: 32, 85: 31,
  86: 30, 87: 29, 88: 28, 89: 27, 90: 26, 91: 25, 92: 24, 93: 23,
  94: 22, 95: 21, 96: 20, 97: 19, 98: 18, 99: 17, 100: 16, 101: 15,
  102: 14, 103: 13, 104: 12, 105: 11, 106: 10, 107: 9, 108: 8, 109: 7,
  110: 6, 111: 5, 112: 4, 113: 3, 114: 2,
};

/** رابط الصوت الأساسي من السيرفر السحابي Hugging Face */
export const getSurahAudioUrl = (number: number): string => {
  const mapped = LEGACY_AMMA_MAP[number] ?? number;
  return `${BASE}/${mapped}.mp3`;
};

/** رابط صوت بديل ومضمون 100% من شبكة CDN عالمية عالية السرعة في حال تعذر السيرفر الأساسي */
export const getFallbackAudioUrl = (number: number): string => {
  return `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${number}.mp3`;
};

// قائمة السور المتوفرة حالياً في التخزين السحابي (يتم تعبئتها ديناميكياً عند بدء التطبيق)
export const CLOUD_AVAILABLE_SURAHS = new Set<number>();

export const hasCloudAudio = (number: number): boolean => {
  const mapped = LEGACY_AMMA_MAP[number] ?? number;
  if (CLOUD_AVAILABLE_SURAHS.size > 0) {
    return CLOUD_AVAILABLE_SURAHS.has(mapped) || CLOUD_AVAILABLE_SURAHS.has(number);
  }
  // في حال لم تكتمل قراءة الشجرة السحابية، فسور الفاتحة وجزء عم متوفرة سحابياً
  return number === 1 || (number >= 78 && number <= 114) || (number >= 1 && number <= 38);
};

// التحقق من توفر الصوت (سحابي أو CDN بديل)
export const isAudioAvailable = (number: number): boolean => {
  return number >= 1 && number <= 114;
};

/**
 * جلب قائمة السور المتوفرة من السيرفر السحابي (Hugging Face)
 * هذا يجعل التطبيق يكتشف السور الجديدة تلقائياً بدون الحاجة لتحديث الكود.
 */
export async function initCloudAudioAvailability() {
  try {
    const res = await fetch(`https://huggingface.co/api/datasets/hammoualiyoucef20/quran-audio/tree/main?t=${Date.now()}`);
    if (!res.ok) return;
    const data = await res.json();
    data.forEach((item: any) => {
      if (item.type === 'file' && item.path.endsWith('.mp3')) {
        const num = parseInt(item.path.replace('.mp3', ''), 10);
        if (!isNaN(num)) CLOUD_AVAILABLE_SURAHS.add(num);
      }
    });
    console.log(`[Cloud Audio] Loaded ${CLOUD_AVAILABLE_SURAHS.size} available surahs.`);
  } catch (err) {
    console.error("Failed to fetch cloud audio tree:", err);
  }
}
/**
 * Robust fetch with exponential backoff retry for audio files
 */
export async function fetchAudioWithRetry(url: string, signal?: AbortSignal, maxRetries = 3): Promise<Response> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const response = await fetch(url, { signal, cache: "default" });
      if (response.ok) return response;
      if (response.status === 404) return response; // don't retry non-existent files
    } catch (e) {
      if (signal?.aborted) throw e;
      attempt++;
      if (attempt >= maxRetries) throw e;
      // Wait with backoff: 500ms, 1000ms, 2000ms
      await new Promise(res => setTimeout(res, 500 * Math.pow(2, attempt - 1)));
    }
  }
  throw new Error(`Failed to fetch audio after ${maxRetries} attempts`);
}
