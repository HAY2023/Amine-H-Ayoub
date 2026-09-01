import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT_PATH = path.join(__dirname, '../src/data/localQuranCorpus.json');

// List of surahs from quranData.ts
const SURAHS = [
  { number: 1, name: "الفاتحة", ayahCount: 7 },
  { number: 114, name: "الناس", ayahCount: 6 },
  { number: 113, name: "الفلق", ayahCount: 5 },
  { number: 112, name: "الإخلاص", ayahCount: 4 },
  { number: 111, name: "المسد", ayahCount: 5 },
  { number: 110, name: "النصر", ayahCount: 3 },
  { number: 109, name: "الكافرون", ayahCount: 6 },
  { number: 108, name: "الكوثر", ayahCount: 3 },
  { number: 107, name: "الماعون", ayahCount: 7 },
  { number: 106, name: "قريش", ayahCount: 4 },
  { number: 105, name: "الفيل", ayahCount: 5 },
  { number: 104, name: "الهمزة", ayahCount: 9 },
  { number: 103, name: "العصر", ayahCount: 3 },
  { number: 102, name: "التكاثر", ayahCount: 8 },
  { number: 101, name: "القارعة", ayahCount: 11 },
  { number: 100, name: "العاديات", ayahCount: 11 },
  { number: 99, name: "الزلزلة", ayahCount: 8 },
  { number: 98, name: "البينة", ayahCount: 8 },
  { number: 97, name: "القدر", ayahCount: 5 },
  { number: 96, name: "العلق", ayahCount: 19 },
  { number: 95, name: "التين", ayahCount: 8 },
  { number: 94, name: "الشرح", ayahCount: 8 },
  { number: 93, name: "الضحى", ayahCount: 11 },
  { number: 92, name: "الليل", ayahCount: 21 },
  { number: 91, name: "الشمس", ayahCount: 15 },
  { number: 90, name: "البلد", ayahCount: 20 },
  { number: 89, name: "الفجر", ayahCount: 30 },
  { number: 88, name: "الغاشية", ayahCount: 26 },
  { number: 87, name: "الأعلى", ayahCount: 19 },
  { number: 86, name: "الطارق", ayahCount: 17 },
  { number: 85, name: "البروج", ayahCount: 22 },
  { number: 84, name: "الإنشقاق", ayahCount: 25 },
  { number: 83, name: "المطففين", ayahCount: 36 },
  { number: 82, name: "الإنفطار", ayahCount: 19 },
  { number: 81, name: "التكوير", ayahCount: 29 },
  { number: 80, name: "عبس", ayahCount: 42 },
  { number: 79, name: "النازعات", ayahCount: 46 },
  { number: 78, name: "النبأ", ayahCount: 40 },
  { number: 77, name: "المرسلات", ayahCount: 50 },
  { number: 76, name: "الإنسان", ayahCount: 31 },
  { number: 75, name: "القيامة", ayahCount: 40 },
  { number: 74, name: "المدثر", ayahCount: 56 },
  { number: 73, name: "المزمل", ayahCount: 20 },
  { number: 72, name: "الجن", ayahCount: 28 },
  { number: 71, name: "نوح", ayahCount: 28 },
  { number: 70, name: "المعارج", ayahCount: 44 },
  { number: 69, name: "الحاقة", ayahCount: 52 },
  { number: 68, name: "القلم", ayahCount: 52 },
  { number: 67, name: "الملك", ayahCount: 30 },
  { number: 66, name: "التحريم", ayahCount: 12 },
  { number: 65, name: "الطلاق", ayahCount: 12 },
  { number: 64, name: "التغابن", ayahCount: 18 },
  { number: 63, name: "المنافقون", ayahCount: 11 },
  { number: 62, name: "الجمعة", ayahCount: 11 },
  { number: 61, name: "الصف", ayahCount: 14 },
  { number: 60, name: "الممتحنة", ayahCount: 13 },
  { number: 59, name: "الحشر", ayahCount: 24 },
  { number: 58, name: "المجادلة", ayahCount: 22 },
  { number: 57, name: "الحديد", ayahCount: 29 },
  { number: 56, name: "الواقعة", ayahCount: 96 },
  { number: 55, name: "الرحمن", ayahCount: 78 },
  { number: 54, name: "القمر", ayahCount: 55 },
  { number: 53, name: "النجم", ayahCount: 62 },
  { number: 52, name: "الطور", ayahCount: 49 },
  { number: 51, name: "الذاريات", ayahCount: 60 },
  { number: 50, name: "ق", ayahCount: 45 },
  { number: 49, name: "الحجرات", ayahCount: 18 },
  { number: 48, name: "الفتح", ayahCount: 29 },
  { number: 47, name: "محمد", ayahCount: 38 },
  { number: 46, name: "الأحقاف", ayahCount: 35 },
  { number: 45, name: "الجاثية", ayahCount: 37 },
  { number: 44, name: "الدخان", ayahCount: 59 },
  { number: 43, name: "الزخرف", ayahCount: 89 },
  { number: 42, name: "الشورى", ayahCount: 53 },
  { number: 41, name: "فصلت", ayahCount: 54 },
  { number: 40, name: "غافر", ayahCount: 85 },
  { number: 39, name: "الزمر", ayahCount: 75 },
  { number: 38, name: "ص", ayahCount: 88 },
  { number: 37, name: "الصافات", ayahCount: 182 },
  { number: 36, name: "يس", ayahCount: 83 },
];

async function fetchCorpus() {
  console.log("Fetching Quran Uthmani text from alquran.cloud...");
  const res = await fetch("http://api.alquran.cloud/v1/quran/quran-uthmani");
  const data = await res.json();
  const allSurahs = data.data.surahs;

  const corpus = [];

  for (const s of SURAHS) {
    const apiSurah = allSurahs.find(x => x.number === s.number);
    if (!apiSurah) continue;

    let ayahs = apiSurah.ayahs.map(a => ({
      n: a.numberInSurah,
      text: a.text
    }));

    // strip basmala if it's not surah Al-Fatihah
    if (s.number !== 1 && ayahs.length > 0) {
      const firstText = ayahs[0].text;
      // Basmala ends with "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ " which is usually 4 words.
      const words = firstText.split(" ");
      if (words.length > 4 && firstText.includes("بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ")) {
         ayahs[0].text = firstText.replace("بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ", "");
      }
    }

    corpus.push({
      app: s.number,
      std: s.number,
      name: s.name,
      ayahs
    });
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(corpus, null, 2), "utf8");
  console.log(`Saved ${corpus.length} surahs to ${OUT_PATH}`);
}

fetchCorpus().catch(console.error);
