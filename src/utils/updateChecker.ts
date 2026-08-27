export const CURRENT_VERSION = "1.0.0-Primary";

export interface UpdateInfo {
  hasUpdate: boolean;
  latestVersion: string;
  downloadUrl: string;
  directDownloadUrl: string;
  assetName: string;
  releaseNotes?: string;
}

/**
 * Detects the current operating system to match the correct release asset.
 */
function getPlatform(): "android" | "ios" | "windows" | "mac" | "linux" | "unknown" {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) return "ios";
  if (ua.includes("android")) return "android";
  if (ua.includes("win")) return "windows";
  if (ua.includes("mac")) return "mac";
  if (ua.includes("linux")) return "linux";
  return "unknown";
}

export const HF_RELEASES_BASE = "https://huggingface.co/datasets/hammoualiyoucef20/quran-app-releases/resolve/main";

export function getHFPlatformDirectUrl(): string {
  const platform = getPlatform();
  if (platform === "windows") return `${HF_RELEASES_BASE}/Quran_1.0.0_x64-setup.exe`;
  if (platform === "android") return `${HF_RELEASES_BASE}/Quran_1.0.0_Android.apk`;
  if (platform === "ios") return "https://amine-h-ayoub.vercel.app/";
  return `${HF_RELEASES_BASE}/Quran_1.0.0_x64-setup.exe`;
}

/**
 * Parses version strings: always returns false to prevent any update notification.
 */
export function isNewerVersion(_current: string, _latest: string): boolean {
  return false;
}

/**
 * Disabled update check: always reports no update needed.
 */
export async function checkForUpdates(): Promise<UpdateInfo> {
  const hfDirectUrl = getHFPlatformDirectUrl();
  return {
    hasUpdate: false,
    latestVersion: CURRENT_VERSION,
    downloadUrl: hfDirectUrl,
    directDownloadUrl: hfDirectUrl,
    assetName: "Quran_1.0.0",
  };
}
