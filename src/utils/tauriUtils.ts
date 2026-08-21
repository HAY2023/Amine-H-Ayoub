import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export const isTauri = (): boolean => {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
};

// ── وضع المالك (المطوّر): يفتح لصاحب التطبيق المصحفَ وأدوات المحتوى لإكمال العمل ──
const OWNER_KEY = "mushaf:devReader";
/** هل وضع المالك مُفعَّل على هذا الجهاز؟ */
export const isMushafDevEnabled = (): boolean => {
  try { return localStorage.getItem(OWNER_KEY) === "1"; } catch { return false; }
};
export const setMushafDev = (on: boolean): void => {
  try { localStorage.setItem(OWNER_KEY, on ? "1" : "0"); } catch { /* ignore */ }
  if (typeof window !== "undefined") window.dispatchEvent(new Event("mushaf:ownermode"));
};
/** المصحف مُتاح لجميع المستخدمين الآن. */
export const shouldHideMushaf = (): boolean => false;

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
    const path = await invoke<string>("get_offline_audio_url", { surahNumber });
    return convertFileSrc(path);
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

/**
 * Intercepts Tauri window close requests when Kids Mode is active.
 */
export async function setupTauriCloseHandler(onRequestUnlock: () => void): Promise<() => void> {
  if (!isTauri()) return () => {};
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const appWindow = getCurrentWindow();
    const unlisten = await appWindow.onCloseRequested(async (event) => {
      const { isKidsMode } = await import("@/data/kidsLock");
      if (isKidsMode()) {
        event.preventDefault();
        onRequestUnlock();
      }
    });
    return unlisten;
  } catch (e) {
    console.warn("Tauri close handler setup:", e);
    return () => {};
  }
}

/**
 * Closes the application completely (Tauri window destroy).
 */
export async function closeTauriApp(): Promise<void> {
  if (!isTauri()) return;
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const appWindow = getCurrentWindow();
    await appWindow.destroy();
  } catch (e) {
    console.error("Failed to destroy Tauri window:", e);
  }
}

/**
 * Opens an external URL safely in default system browser across Tauri desktop, mobile, and web.
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (!url) return;
  if (isTauri()) {
    try {
      await invoke("plugin:opener|open", { path: url });
      return;
    } catch {
      try {
        await invoke("open_url", { url });
        return;
      } catch {
        /* fallback to browser open */
      }
    }
  }
  if (typeof window !== "undefined") {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (!w) {
      window.location.href = url;
    }
  }
}
