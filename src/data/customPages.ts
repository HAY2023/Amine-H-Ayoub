/**
 * صفحات/سور مخصّصة يضيفها المستخدم برفع صورة في المعايرة.
 * - بيانات الصفحة (المعرّف، الاسم، الرقم) تُحفظ في localStorage (صغيرة).
 * - صور الصفحات تُحفظ في IndexedDB (تتحمّل الصور الكبيرة، عكس localStorage).
 */

export interface CustomPage {
  src: string;     // معرّف فريد مثل "custom:78:1700000000000"
  name: string;    // اسم السورة
  surah: number;   // رقم السورة
}

const META_KEY = "mushaf:customPages:v1";

export const getCustomPages = (): CustomPage[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveCustomPages = (pages: CustomPage[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(META_KEY, JSON.stringify(pages));
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

// ─────────────── صور الصفحات (IndexedDB) ───────────────

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

export async function savePageImage(id: string, dataUrl: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(dataUrl, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
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
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
