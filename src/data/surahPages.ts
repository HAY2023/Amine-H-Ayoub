// Maps surah names (from API) to their Quran page images
// The API uses custom numbering (1-14), but the page images show actual Quran surahs

// Mapping from API surah name → page image(s)
export const surahPageMap: Record<string, string[]> = {
  "الفاتحة": [], // No page image uploaded for Al-Fatiha
  "التكاثر": ["/pages/599.jpg"],
  "العصر": ["/pages/600.jpg"],
  "الهمزة": ["/pages/600.jpg"],
  "الفيل": ["/pages/600.jpg"],
  "قريش": ["/pages/601.jpg"],
  "الماعون": ["/pages/601.jpg"],
  "الكوثر": ["/pages/601.jpg"],
  "الكافرون": ["/pages/602.jpg"],
  "النصر": ["/pages/602.jpg"],
  "المسد": ["/pages/602.jpg"],
  "الإخلاص": ["/pages/603.jpg"],
  "الفلق": ["/pages/603.jpg"],
  "الناس": ["/pages/603.jpg"],
};

export function getPageImages(surahName: string): string[] {
  return surahPageMap[surahName] || [];
}
