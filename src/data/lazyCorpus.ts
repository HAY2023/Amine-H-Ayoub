/**
 * Lazy load corpus data - load only when needed
 */

import type { SurahText } from "./quranText";

let corpusPromise: Promise<SurahText[]> | null = null;
let corpusCache: SurahText[] | null = null;

/**
 * Lazy load the Quran text corpus
 * ⚡ الأداء: يُحمَّل ملف نص المصحف (حجمه ~5MB) ديناميكياً عند أول حاجة فقط،
 * ولا يُضمَّن في حزمة الإطلاق الرئيسية إطلاقاً — ما يجعل الفتح الأول سريعاً جداً.
 */
export async function getLazyCorpus(): Promise<SurahText[]> {
  if (corpusCache) return corpusCache;

  if (!corpusPromise) {
    corpusPromise = import("./quranText")
      .then(m => m.ensureCorpus())
      .then(corpus => {
        corpusCache = corpus;
        corpusPromise = null;
        return corpus;
      });
  }

  return corpusPromise;
}

/**
 * Preload corpus in background (call after main render)
 */
export function preloadCorpusInBackground() {
  if (!corpusCache && !corpusPromise) {
    // Schedule for next idle time
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => getLazyCorpus().catch(() => { /* silent fail */ }));
    } else {
      setTimeout(() => getLazyCorpus().catch(() => { /* silent fail */ }), 1000);
    }
  }
}

/**
 * Check if corpus is ready (synchronous check)
 */
export function isCorpusReady() {
  return !!corpusCache;
}
