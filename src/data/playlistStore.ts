export interface PlaylistConfigItem {
  id: string; // We'll convert built-in surah numbers to strings like "builtin-1" to avoid key collisions
  type: 'builtin' | 'custom';
  originalId: string | number;
  customName?: string;
  isHidden?: boolean;
  order: number;
}

const DB_NAME = "LearnQuranKids_PlaylistDB";
const STORE_NAME = "playlist_config";
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

export async function getPlaylistConfig(): Promise<PlaylistConfigItem[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const results = (req.result as PlaylistConfigItem[]) || [];
      results.sort((a, b) => a.order - b.order);
      resolve(results);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function savePlaylistConfig(items: PlaylistConfigItem[]): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    
    // Clear existing
    const clearReq = store.clear();
    clearReq.onsuccess = () => {
      let pending = items.length;
      if (pending === 0) return resolve();
      
      let hasError = false;
      for (const item of items) {
        const putReq = store.put(item);
        putReq.onsuccess = () => {
          pending--;
          if (pending === 0 && !hasError) resolve();
        };
        putReq.onerror = () => {
          hasError = true;
          reject(putReq.error);
        };
      }
    };
    clearReq.onerror = () => reject(clearReq.error);
  });
}

// Helper types for sync
export interface SyncSurah { number: number; }
export interface SyncCustomAudio { id: string; }

export async function syncPlaylist(builtinSurahs: SyncSurah[], customAudios: SyncCustomAudio[]): Promise<PlaylistConfigItem[]> {
  const existingConfig = await getPlaylistConfig();
  const configMap = new Map(existingConfig.map(c => [c.id, c]));
  
  let maxOrder = existingConfig.length > 0 ? Math.max(...existingConfig.map(c => c.order)) : -1;
  const newConfig: PlaylistConfigItem[] = [];

  // Add/Update custom audios
  for (const ca of customAudios) {
    const id = `custom-${ca.id}`;
    if (configMap.has(id)) {
      newConfig.push(configMap.get(id)!);
      configMap.delete(id);
    } else {
      maxOrder++;
      newConfig.push({ id, type: 'custom', originalId: ca.id, order: maxOrder });
    }
  }

  // Add/Update built-in surahs
  for (const s of builtinSurahs) {
    const id = `builtin-${s.number}`;
    if (configMap.has(id)) {
      newConfig.push(configMap.get(id)!);
      configMap.delete(id);
    } else {
      maxOrder++;
      newConfig.push({ id, type: 'builtin', originalId: s.number, order: maxOrder });
    }
  }

  // Sort and normalize orders
  newConfig.sort((a, b) => a.order - b.order);
  newConfig.forEach((c, i) => c.order = i);

  await savePlaylistConfig(newConfig);
  return newConfig;
}
