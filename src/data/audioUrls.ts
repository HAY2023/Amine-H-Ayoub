// روابط الملفات الصوتية على Lovable Cloud Storage (bucket: quran-audio)
// الترقيم يتبع ترقيم التطبيق المخصص (1=الفاتحة، 2=الناس، ... إلى 14=التكاثر)

const BASE = "https://gimdekpxutvnopovofmc.supabase.co/storage/v1/object/public/quran-audio/surahs";

export const getSurahAudioUrl = (number: number): string => `${BASE}/${number}.mp3`;

// قائمة السور المتوفرة حالياً في التخزين السحابي
export const CLOUD_AVAILABLE_SURAHS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

export const hasCloudAudio = (number: number): boolean => CLOUD_AVAILABLE_SURAHS.has(number);
