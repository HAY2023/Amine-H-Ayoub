import { supabase, hasValidSupabaseKey } from "../lib/supabase";

export interface Achievement {
  id: string; // Unique ID (e.g. timestamp)
  date: string; // ISO String
  title?: string; // Optional title or note
  localSrc?: string; // Base64 data from IndexedDB
}

const META_KEY = "kids:achievements:v1";
const DB_NAME = "mushaf_achievements";
const STORE = "images";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ─────────────── الحفظ المحلي في IndexedDB ───────────────
export async function saveAchievementImageLocal(id: string, base64: string): Promise<void> {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(base64, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAchievementImageLocal(id: string): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as string) || null);
    req.onerror = () => reject(tx.error);
  });
}

export async function getAllAchievementImages(): Promise<Record<string, string>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const keysReq = store.getAllKeys();
    const valsReq = store.getAll();
    tx.oncomplete = () => {
      const out: Record<string, string> = {};
      const keys = keysReq.result as string[];
      const vals = valsReq.result as string[];
      keys.forEach((k, i) => { out[k] = vals[i]; });
      resolve(out);
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteAchievementImageLocal(id: string): Promise<void> {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─────────────── بيانات الإنجازات (Metadata) ───────────────
export const getAchievementsMeta = (): Achievement[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveAchievementsMeta = (achievements: Achievement[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(META_KEY, JSON.stringify(achievements));
};

export const addAchievementMeta = (achievement: Achievement): Achievement[] => {
  const all = getAchievementsMeta();
  if (!all.some(a => a.id === achievement.id)) all.push(achievement);
  // Sort descending by date
  all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  saveAchievementsMeta(all);
  return all;
};

export const deleteAchievementMeta = (id: string): Achievement[] => {
  const all = getAchievementsMeta().filter(a => a.id !== id);
  saveAchievementsMeta(all);
  return all;
};

// ─────────────── الرفع إلى السحابة ───────────────
export const uploadAchievementToCloud = async (file: File, achievementId: string) => {
  if (!hasValidSupabaseKey()) {
    console.warn("No Supabase key, saving locally only.");
    return { success: true, localOnly: true };
  }

  try {
    const filename = `achievements/${achievementId}_${file.name}`;
    
    // 1. رفع الملف إلى Storage
    const { error: uploadError, data: uploadData } = await supabase.storage
      .from("quran-audio") // استخدام السلة المطلوبة
      .upload(filename, file, { cacheControl: "3600", upsert: false });

    if (uploadError) throw uploadError;

    // 2. تسجيل العملية في جدول upload_records
    const { error: dbError } = await supabase
      .from("upload_records")
      .insert([{
        type: "achievement",
        surah_number: 0,
        surah_name: "Achievement",
        data: JSON.stringify({
          id: achievementId,
          filename: file.name,
          size: file.size,
          type: file.type,
          path: uploadData?.path,
          hasLocalCache: true
        }),
        created_at: new Date().toISOString(),
      }]);

    if (dbError) console.error("Failed to log achievement to upload_records", dbError);

    return { success: true, localOnly: false };
  } catch (error) {
    console.error("Cloud upload failed", error);
    return { success: false, error };
  }
};

// ─────────────── حذف كامل للإنجاز ───────────────
export const deleteAchievement = async (id: string) => {
  deleteAchievementMeta(id);
  await deleteAchievementImageLocal(id);
  // Note: For full cleanup, we might want to delete from Supabase storage too, 
  // but for kids apps it's safer to keep cloud backup unless strictly required.
};
