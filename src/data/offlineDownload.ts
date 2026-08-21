/**
 * تنزيل كل المحتوى إلى الجهاز للعمل دون إنترنت.
 * يجلب صوت كل السور وصور الصفحات؛ يخزّنها مخبأ الخدمة (PWA runtimeCaching)
 * فتعمل دون اتصال بعد التنزيل. (الصور المرفوعة محفوظة أصلاً في IndexedDB.)
 */
import { getAllSurahs } from "./quranData";
import { getSurahAudioUrl, fetchAudioWithRetry } from "./audioUrls";
import { saveAudioToCache } from "./offlineAudioCache";

const DONE_KEY = "mushaf:offlineDownloaded";

export interface AssetDownloadItem {
  type: "audio" | "page";
  url: string;
  surahNumber?: number;
}

export const collectAssets = (): AssetDownloadItem[] => {
  const items: AssetDownloadItem[] = [];
  const surahs = getAllSurahs();
  for (const s of surahs) {
    items.push({
      type: "audio",
      url: getSurahAudioUrl(s.number),
      surahNumber: s.number,
    });
  }
  // ملاحظة: نُحمّل الملفات الصوتية فقط — صور صفحات المصحف مُستبعدة حالياً
  return items;
};

export const isDownloaded = (): boolean => {
  try { return !!localStorage.getItem(DONE_KEY); } catch { return false; }
};

/** ينزّل التلاوات الصوتية ويحفظها في الكاش وIndexedDB وقرص Tauri للعمل التام دون إنترنت */
export const downloadEverything = async (
  onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<{ ok: number; fail: number; total: number; aborted?: boolean }> => {
  const items = collectAssets();
  let done = 0, ok = 0, fail = 0;

  for (const item of items) {
    if (signal?.aborted) break;
    try {
      const res = await fetchAudioWithRetry(item.url, signal, 3);
      if (res.ok) {
        const blob = await res.blob();
        if (item.surahNumber) {
          await saveAudioToCache(item.url, item.surahNumber, blob);
        }
        ok++;
      } else {
        fail++;
      }
    } catch (error) {
      if (signal?.aborted) break;
      fail++;
    }
    done++;
    onProgress?.(done, items.length);
  }

  if (ok > 0) {
    try { localStorage.setItem(DONE_KEY, new Date().toISOString()); } catch { /* ignore */ }
  }
  return { ok, fail, total: items.length, aborted: signal?.aborted };
};

