import { supabase, hasValidSupabaseKey } from "../lib/supabase";

/**
 * منطقة سورة على صفحة المصحف — تعريف فقط (بلا سلوك نقر).
 * تُستخدم في المعايرة لتحديد مساحة كل سورة وكتابة اسمها.
 */
export interface SurahRegion {
  name: string;        // اسم السورة كما يكتبه المستخدم (مثل: النبأ)
  surah?: number;      // رقم اختياري إن وُجد
  x: number;
  y: number;
  width: number;
  height: number;
}

const REGIONS_STORAGE_KEY = "mushaf:surahRegions:v1";

const clone = (regions: SurahRegion[]) => regions.map((r) => ({ ...r }));

export const getSavedSurahRegions = (): Record<string, SurahRegion[]> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(REGIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const getPageSurahRegions = (pageSrc: string): SurahRegion[] => {
  const all = getSavedSurahRegions();
  return pageSrc in all ? clone(all[pageSrc]) : [];
};

export const savePageSurahRegions = async (pageSrc: string, regions: SurahRegion[]) => {
  if (typeof window === "undefined") return;
  const all = getSavedSurahRegions();
  all[pageSrc] = clone(regions);
  localStorage.setItem(REGIONS_STORAGE_KEY, JSON.stringify(all));
  try {
    await supabase.from("store").upsert({ key: REGIONS_STORAGE_KEY, value: all });
  } catch (e) {
    console.error("Supabase save regions error:", e);
  }
};

/** يجلب مناطق السور من السيرفر إن وُجدت (للمزامنة عبر الأجهزة). */
export const syncSurahRegionsFromServer = async () => {
  if (typeof window === "undefined") return;
  if (!hasValidSupabaseKey()) return;
  try {
    const { data } = await supabase.from("store").select("value").eq("key", REGIONS_STORAGE_KEY).maybeSingle();
    if (data && data.value && Object.keys(data.value as Record<string, unknown>).length > 0) {
      localStorage.setItem(REGIONS_STORAGE_KEY, JSON.stringify(data.value));
      window.dispatchEvent(new Event("mushaf:sync_complete"));
    }
  } catch (e) {
    console.debug("Supabase sync regions info:", e);
  }
};
