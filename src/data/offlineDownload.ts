/**
 * تنزيل كل المحتوى إلى الجهاز للعمل دون إنترنت.
 * يجلب صوت كل السور وصور الصفحات؛ يخزّنها مخبأ الخدمة (PWA runtimeCaching)
 * فتعمل دون اتصال بعد التنزيل. (الصور المرفوعة محفوظة أصلاً في IndexedDB.)
 */
import { getAllSurahs } from "./quranData";
import { getSurahAudioUrl, hasCloudAudio } from "./audioUrls";
import { getAllPageSources } from "./ayahCoordinates";

const DONE_KEY = "mushaf:offlineDownloaded";

const audioUrl = (n: number) => (hasCloudAudio(n) ? getSurahAudioUrl(n) : `/audio/surahs/${n}.mp3`);

export const collectAssets = (): string[] => {
  const urls = new Set<string>();
  getAllSurahs().forEach(s => urls.add(audioUrl(s.number)));
  getAllPageSources().forEach(src => { if (src.startsWith("/")) urls.add(src); });
  return Array.from(urls);
};

export const isDownloaded = (): boolean => {
  try { return !!localStorage.getItem(DONE_KEY); } catch { return false; }
};

/** ينزّل كل الأصول، ويستدعي onProgress(done,total) بعد كل أصل. */
export const downloadEverything = async (
  onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<{ ok: number; fail: number; total: number; aborted?: boolean }> => {
  const urls = collectAssets();
  let done = 0, ok = 0, fail = 0;
  for (const url of urls) {
    if (signal?.aborted) break;
    try {
      const r = await fetch(url, { cache: "reload", signal });
      if (r.ok) ok++; else fail++;
    } catch (error) {
      if (signal?.aborted) break;
      fail++;
    }
    done++;
    onProgress?.(done, urls.length);
  }
  try { localStorage.setItem(DONE_KEY, new Date().toISOString()); } catch { /* ignore */ }
  return { ok, fail, total: urls.length, aborted: signal?.aborted };
};
