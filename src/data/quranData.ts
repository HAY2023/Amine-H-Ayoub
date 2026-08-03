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
  { number: 15, name: "القارعة", ayahCount: 11 },
  { number: 16, name: "العاديات", ayahCount: 11 },
  { number: 17, name: "الزلزلة", ayahCount: 8 },
  { number: 18, name: "البينة", ayahCount: 8 },
  { number: 19, name: "القدر", ayahCount: 5 },
  { number: 20, name: "العلق", ayahCount: 19 },
  { number: 21, name: "التين", ayahCount: 8 },
  { number: 22, name: "الشرح", ayahCount: 8 },
  { number: 23, name: "الضحى", ayahCount: 11 },
  { number: 24, name: "الليل", ayahCount: 21 },
  { number: 25, name: "الشمس", ayahCount: 15 },
  { number: 26, name: "البلد", ayahCount: 20 },
  { number: 27, name: "الفجر", ayahCount: 30 },
  { number: 28, name: "الغاشية", ayahCount: 26 },
  { number: 29, name: "الأعلى", ayahCount: 19 },
  { number: 30, name: "الطارق", ayahCount: 17 },
  { number: 31, name: "البروج", ayahCount: 22 },
  { number: 32, name: "الإنشقاق", ayahCount: 25 },
  { number: 33, name: "المطففين", ayahCount: 36 },
  { number: 34, name: "الإنفطار", ayahCount: 19 },
  { number: 35, name: "التكوير", ayahCount: 29 },
  { number: 36, name: "عبس", ayahCount: 42 },
  { number: 37, name: "النازعات", ayahCount: 46 },
  { number: 38, name: "النبأ", ayahCount: 40 },
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
