// روابط الملفات الصوتية على Lovable Cloud Storage (bucket: quran-audio)
// الترقيم يتبع ترقيم التطبيق المخصص (1=الفاتحة، 2=الناس، ... إلى 14=التكاثر)

const BASE = "https://huggingface.co/datasets/hammoualiyoucef20/quran-audio/resolve/main";

export const getSurahAudioUrl = (number: number): string => `${BASE}/${number}.mp3`;

// قائمة السور المتوفرة حالياً في التخزين السحابي (يتم تعبئتها ديناميكياً عند بدء التطبيق)
export const CLOUD_AVAILABLE_SURAHS = new Set<number>();

export const hasCloudAudio = (number: number): boolean => 
  CLOUD_AVAILABLE_SURAHS.has(number) || (number >= 1 && number <= 114);

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
