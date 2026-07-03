import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export const isTauri = (): boolean => {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
};

// ── وضع المالك (المطوّر): يفتح لصاحب التطبيق المصحفَ وأدوات المحتوى لإكمال العمل ──
// المصحف غير جاهز للإطلاق، فيُخفى عن جميع المستخدمين (ويب وتطبيق) وتظهر رسالة تطوير،
// إلا لصاحب التطبيق حين يُفعّل وضع المالك (بالنقر ٥ مرّات على أيقونة رسالة التطوير).
const OWNER_KEY = "mushaf:devReader";
/** هل وضع المالك مُفعَّل على هذا الجهاز؟ */
export const isMushafDevEnabled = (): boolean => {
  try { return localStorage.getItem(OWNER_KEY) === "1"; } catch { return false; }
};
export const setMushafDev = (on: boolean): void => {
  try { localStorage.setItem(OWNER_KEY, on ? "1" : "0"); } catch { /* ignore */ }
  if (typeof window !== "undefined") window.dispatchEvent(new Event("mushaf:ownermode"));
};
/** يُخفى المصحف (تُعرض رسالة التطوير) لكل المستخدمين ما لم يُفعّل صاحب التطبيق وضع المالك. */
export const shouldHideMushaf = (): boolean => !isMushafDevEnabled();

export interface DownloadProgressPayload {
  surah_number: number;
  progress: number;
  status: "downloading" | "completed" | "error";
}

/**
 * Checks if a Surah audio is downloaded locally.
 */
export async function checkOfflineStatus(surahNumber: number): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    return await invoke<boolean>("check_offline_status", { surahNumber });
  } catch (e) {
    console.error("check_offline_status error:", e);
    return false;
  }
}

/**
 * Gets the local asset URL for a downloaded Surah audio.
 */
export async function getOfflineAudioUrl(surahNumber: number): Promise<string | null> {
  if (!isTauri()) return null;
  try {
    return await invoke<string>("get_offline_audio_url", { surahNumber });
  } catch (e) {
    console.error("get_offline_audio_url error:", e);
    return null;
  }
}

/**
 * Initiates the download of a Surah audio in the Rust backend.
 */
export async function downloadSurah(audioUrl: string, surahNumber: number): Promise<string | null> {
  if (!isTauri()) return null;
  try {
    return await invoke<string>("download_surah", { audioUrl, surahNumber });
  } catch (e) {
    console.error("download_surah error:", e);
    return null;
  }
}

/**
 * Listens to download progress events emitted by the Rust backend.
 */
export function listenToDownloadProgress(
  onProgress: (payload: DownloadProgressPayload) => void
): () => void {
  if (!isTauri()) return () => {};

  let unsubscribe: () => void = () => {};

  listen<DownloadProgressPayload>("download-progress", (event) => {
    onProgress(event.payload);
  }).then((unsub) => {
    unsubscribe = unsub;
  });

  return () => {
    unsubscribe();
  };
}
