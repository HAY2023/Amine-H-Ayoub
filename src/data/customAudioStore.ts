export interface CustomAudio {
  id: string;
  title: string;
  blob: Blob;
  order: number;
  createdAt: number;
}

const DB_NAME = "LearnQuranKids_AudioDB";
const STORE_NAME = "custom_audios";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("order", "order", { unique: false });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  
  return dbPromise;
}

export async function saveCustomAudio(audio: CustomAudio): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(audio);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAllCustomAudios(): Promise<CustomAudio[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const results = (req.result as CustomAudio[]) || [];
      results.sort((a, b) => a.order - b.order);
      resolve(results);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteCustomAudio(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function updateCustomAudioOrder(updates: { id: string, order: number }[]): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    
    let pending = updates.length;
    if (pending === 0) return resolve();
    
    let hasError = false;
    
    updates.forEach(update => {
      const getReq = store.get(update.id);
      getReq.onsuccess = () => {
        if (getReq.result) {
          const item = getReq.result as CustomAudio;
          item.order = update.order;
          store.put(item);
        }
        pending--;
        if (pending === 0 && !hasError) resolve();
      };
      getReq.onerror = () => {
        hasError = true;
        reject(getReq.error);
      };
    });
  });
}

export async function updateCustomAudioTitle(id: string, newTitle: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      if (getReq.result) {
        const item = getReq.result as CustomAudio;
        item.title = newTitle;
        const putReq = store.put(item);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      } else {
        reject(new Error("Audio not found"));
      }
    };
    getReq.onerror = () => reject(getReq.error);
  });
}
