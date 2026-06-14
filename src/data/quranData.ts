// مصدر واحد لكل بيانات القرآن
// يمكن إضافة سور جديدة بسهولة هنا فقط

export interface SurahInfo {
  number: number;
  name: string;
  ayahCount: number;
}

export const SURAHS: SurahInfo[] = [
  { number: 1, name: "الفاتحة", ayahCount: 7 },
  { number: 2, name: "الناس", ayahCount: 6 },
  { number: 3, name: "الفلق", ayahCount: 5 },
  { number: 4, name: "الإخلاص", ayahCount: 4 },
  { number: 5, name: "المسد", ayahCount: 5 },
  { number: 6, name: "النصر", ayahCount: 3 },
  { number: 7, name: "الكافرون", ayahCount: 6 },
  { number: 8, name: "الكوثر", ayahCount: 3 },
  { number: 9, name: "الماعون", ayahCount: 7 },
  { number: 10, name: "قريش", ayahCount: 4 },
  { number: 11, name: "الفيل", ayahCount: 5 },
  { number: 12, name: "الهمزة", ayahCount: 9 },
  { number: 13, name: "العصر", ayahCount: 3 },
  { number: 14, name: "التكاثر", ayahCount: 8 },
];

// Helper functions
export function getSurahByNumber(num: number): SurahInfo | undefined {
  return SURAHS.find(s => s.number === num);
}

export function getSurahName(num: number): string {
  return getSurahByNumber(num)?.name || `سورة ${num}`;
}

export function getSurahAyahCount(num: number): number {
  return getSurahByNumber(num)?.ayahCount || 0;
}

export function getAllSurahs(): SurahInfo[] {
  return SURAHS;
}
