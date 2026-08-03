/**
 * Lazy load corpus data - load only when needed
 */

import { ensureCorpus } from "./quranText";

let corpusPromise: Promise<ReturnType<typeof ensureCorpus>> | null = null;
let corpusCache: Awaited<ReturnType<typeof ensureCorpus>> | null = null;

/**
 * Lazy load the Quran text corpus
 * Loads only when first accessed (not on app startup)
 */
export async function getLazyCorpus() {
  if (corpusCache) return corpusCache;
  
  if (!corpusPromise) {
    corpusPromise = ensureCorpus().then(corpus => {
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
