import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export const isTauri = (): boolean => {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
};

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
