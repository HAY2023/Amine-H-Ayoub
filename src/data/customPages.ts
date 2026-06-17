/**
 * صفحات/سور مخصّصة يضيفها المستخدم برفع صورة في المعايرة.
 * كل شيء يُحفظ على السيرفر (Supabase store) + نسخة محلية للسرعة:
 *  - بيانات الصفحات (الاسم/الرقم)            → localStorage + store[META_KEY]
 *  - ترتيب الصفحات في القارئ                  → localStorage + store[ORDER_KEY]
 *  - صور الصفحات (base64)                     → IndexedDB (محلي) + store["mushaf:pageImg:<id>"]
 */
import { supabase, hasValidSupabaseKey } from "../lib/supabase";
import { getPageSurahRegions } from "./surahRegions";

export interface CustomPage {
  src: string;     // معرّف فريد مثل "custom:1700000000000"
  name: string;    // اسم/رقم الصفحة (قد تحوي أكثر من سورة)
  surah?: number;  // رقم سورة اختياري (للتوافق)
}

const META_KEY = "mushaf:customPages:v1";
const ORDER_KEY = "mushaf:pageOrder:v1";
const imgKey = (id: string) => `mushaf:pageImg:${id}`;

const upsert = (key: string, value: unknown) => {
  if (!hasValidSupabaseKey()) return;
  supabase.from("store").upsert({ key, value }).then(() => {}, () => {});
};

// ─────────────── بيانات الصفحات ───────────────

export const getCustomPages = (): CustomPage[] => {
  if (typeof window === "undefined") return [];
  try { const raw = localStorage.getItem(META_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
};

export const saveCustomPages = (pages: CustomPage[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(META_KEY, JSON.stringify(pages));
  upsert(META_KEY, pages);
};

export const addCustomPage = (page: CustomPage): CustomPage[] => {
  const all = getCustomPages();
  if (!all.some(p => p.src === page.src)) all.push(page);
  saveCustomPages(all);
  return all;
};

export const removeCustomPage = (src: string): CustomPage[] => {
  const all = getCustomPages().filter(p => p.src !== src);
  saveCustomPages(all);
  return all;
};

// ─────────────── ترتيب الصفحات ───────────────

export const getPageOrder = (): string[] => {
  if (typeof window === "undefined") return [];
  try { const raw = localStorage.getItem(ORDER_KEY); const v = raw ? JSON.parse(raw) : []; return Array.isArray(v) ? v : []; } catch { return []; }
};

export const savePageOrder = (srcs: string[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(ORDER_KEY, JSON.stringify(srcs));
  upsert(ORDER_KEY, srcs);
};

export const clearPageOrder = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ORDER_KEY);
  upsert(ORDER_KEY, []);
};

// ─────────────── صور الصفحات (IndexedDB + سيرفر) ───────────────

const DB_NAME = "mushaf";
const STORE = "pageImages";

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

const idbPut = async (id: string, dataUrl: string) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(dataUrl, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export async function savePageImage(id: string, dataUrl: string): Promise<void> {
  await idbPut(id, dataUrl);
  upsert(imgKey(id), { d: dataUrl }); // حفظ على السيرفر أيضاً
}

export async function getAllPageImages(): Promise<Record<string, string>> {
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

export async function deletePageImage(id: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  // ملاحظة: لا نكتب tombstone على السيرفر (قيمة null يرفضها العمود).
  // الصف اليتيم غير ضارّ: المزامنة تجلب صور الصفحات الموجودة في القائمة فقط،
  // وحذف الصفحة يُزيلها من القائمة (saveCustomPages) فلا تُجلب صورتها أصلاً.
}

// ─────────────── المزامنة من السيرفر ───────────────

export const syncCustomPagesFromServer = async () => {
  if (typeof window === "undefined") return;
  try {
    const localPages = getCustomPages();
    let serverPages: CustomPage[] = [];
    if (hasValidSupabaseKey()) {
      const { data: meta } = await supabase.from("store").select("value").eq("key", META_KEY).maybeSingle();
      if (meta && Array.isArray(meta.value)) serverPages = meta.value as CustomPage[];
    }

    // دمج آمن: السيرفر + المحلي — لا نمسح المحلي أبداً بقائمة فارغة
    const bySrc = new Map<string, CustomPage>();
    [...serverPages, ...localPages].forEach(p => { if (p && p.src) bySrc.set(p.src, { ...bySrc.get(p.src), ...p }); });

    // استرجاع: أي صورة في IndexedDB لصفحة مفقودة من القائمة تُعاد (الاسم من منطقة سورتها)
    const imgs = await getAllPageImages().catch(() => ({} as Record<string, string>));
    Object.keys(imgs).forEach(src => {
      if (src.startsWith("custom:") && !bySrc.has(src)) {
        const regs = getPageSurahRegions(src);
        bySrc.set(src, { src, name: regs[0]?.name || "صفحة مستعادة" });
      }
    });

    const merged = Array.from(bySrc.values());
    localStorage.setItem(META_KEY, JSON.stringify(merged));
    if (merged.length > 0) upsert(META_KEY, merged); // أعِد رفع القائمة المدموجة كمصدر للحقيقة

    if (hasValidSupabaseKey()) {
      const { data: ord } = await supabase.from("store").select("value").eq("key", ORDER_KEY).maybeSingle();
      if (ord && Array.isArray(ord.value) && ord.value.length > 0) localStorage.setItem(ORDER_KEY, JSON.stringify(ord.value));

      // اجلب صور الصفحات الناقصة محلياً بالمفتاح المباشر
      for (const p of merged) {
        if (imgs[p.src]) continue;
        const { data: img } = await supabase.from("store").select("value").eq("key", imgKey(p.src)).maybeSingle();
        const d = (img?.value as { d?: string } | null)?.d;
        if (d) await idbPut(p.src, d).catch(() => {});
      }
    }
    window.dispatchEvent(new Event("mushaf:sync_complete"));
  } catch (e) {
    console.debug("Supabase sync custom pages info:", e);
  }
};
