/**
 * Optional manual timestamps per surah (in seconds).
 * Keys are surah numbers (matching the API), values are arrays of start times — one per ayah.
 * Example: { 1: [0, 5.2, 12.8, 19.4, ...] } means Surah 1, Ayah 1 starts at 0s, Ayah 2 at 5.2s, etc.
 *
 * If a surah is missing here, the player falls back to automatic estimation:
 *   ayahStart = (audioDuration / totalAyahs) * (ayahIndex - 1)
 *
 * To add precise timings later, fill this map. No code changes needed.
 */
export const AYAH_TIMINGS: Record<number, number[]> = {
  // 1: [0, 5.2, 12.8, 19.4, 26.1, 33.0, 40.5], // example: Al-Fatiha
};

/** Approximate ayah counts for surahs in this app (used when API doesn't provide it). */
export const AYAH_COUNTS: Record<number, number> = {
  1: 7,    // الفاتحة
  2: 6,    // الناس
  3: 5,    // الفلق
  4: 4,    // الإخلاص
  5: 5,    // المسد
  6: 3,    // النصر
  7: 6,    // الكافرون
  8: 3,    // الكوثر
  9: 7,    // الماعون
  10: 4,   // قريش
  11: 5,   // الفيل
  12: 9,   // الهمزة
  13: 3,   // العصر
  14: 8,   // التكاثر
};

export function getAyahStartTime(
  surahNumber: number,
  ayahIndex: number,
  audioDuration: number
): number {
  const manual = AYAH_TIMINGS[surahNumber];
  if (manual && manual[ayahIndex - 1] !== undefined) {
    return manual[ayahIndex - 1];
  }
  // Fallback: linear estimation
  const total = AYAH_COUNTS[surahNumber] ?? 1;
  if (total <= 0 || !isFinite(audioDuration)) return 0;
  return (audioDuration / total) * (ayahIndex - 1);
}

export function hasManualTimings(surahNumber: number): boolean {
  return Array.isArray(AYAH_TIMINGS[surahNumber]) && AYAH_TIMINGS[surahNumber].length > 0;
}
