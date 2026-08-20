// روابط الملفات الصوتية على Lovable Cloud Storage (bucket: quran-audio)
// الترقيم يتبع ترقيم التطبيق المخصص (1=الفاتحة، 2=الناس، ... إلى 14=التكاثر)

const BASE = "https://huggingface.co/datasets/hammoualiyoucef20/quran-audio/resolve/main";

export const getSurahAudioUrl = (number: number): string => `${BASE}/${number}.mp3`;

// قائمة السور المتوفرة حالياً في التخزين السحابي
export const CLOUD_AVAILABLE_SURAHS = new Set([
  1, 114, 113, 112, 111, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
  31, 32, 33, 34, 35, 36, 37, 38
]);

export const hasCloudAudio = (number: number): boolean => CLOUD_AVAILABLE_SURAHS.has(number);

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
