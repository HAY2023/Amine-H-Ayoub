export const CURRENT_VERSION = "1.0.0-99";

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
function getPlatform(): "android" | "windows" | "mac" | "linux" | "unknown" {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("android")) return "android";
  if (ua.includes("win")) return "windows";
  if (ua.includes("mac")) return "mac";
  if (ua.includes("linux")) return "linux";
  return "unknown";
}

/**
 * Finds the most suitable release asset file based on platform.
 */
function findDirectAsset(assets: Array<{ name: string; browser_download_url: string }>): { directUrl: string; assetName: string } {
  if (!assets || !assets.length) {
    return { directUrl: "", assetName: "" };
  }

  const platform = getPlatform();

  if (platform === "android") {
    const apk = assets.find(a => a.name.endsWith(".apk"));
    if (apk) return { directUrl: apk.browser_download_url, assetName: apk.name };
  } else if (platform === "windows") {
    const exe = assets.find(a => a.name.endsWith(".exe") || a.name.endsWith("-setup.exe"));
    if (exe) return { directUrl: exe.browser_download_url, assetName: exe.name };
    const msi = assets.find(a => a.name.endsWith(".msi"));
    if (msi) return { directUrl: msi.browser_download_url, assetName: msi.name };
  } else if (platform === "mac") {
    const dmg = assets.find(a => a.name.endsWith(".dmg"));
    if (dmg) return { directUrl: dmg.browser_download_url, assetName: dmg.name };
  } else if (platform === "linux") {
    const appImage = assets.find(a => a.name.endsWith(".AppImage"));
    if (appImage) return { directUrl: appImage.browser_download_url, assetName: appImage.name };
    const deb = assets.find(a => a.name.endsWith(".deb"));
    if (deb) return { directUrl: deb.browser_download_url, assetName: deb.name };
  }

  // Fallback to first downloadable asset
  const first = assets[0];
  return { directUrl: first.browser_download_url, assetName: first.name };
}

/**
 * Checks GitHub releases to see if there is a newer version of the app.
 */
export async function checkForUpdates(): Promise<UpdateInfo> {
  const defaultResult: UpdateInfo = {
    hasUpdate: false,
    latestVersion: CURRENT_VERSION,
    downloadUrl: "https://github.com/HAY2023/Amine-H-Ayoub/releases",
    directDownloadUrl: "",
    assetName: "",
  };

  // فحص الاتصال بالإنترنت أولاً
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("لا يوجد اتصال بالإنترنت. يرجى الاتصال والمحاولة مجدداً.");
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 ثواني كحد أقصى

    const response = await fetch(
      "https://api.github.com/repos/HAY2023/Amine-H-Ayoub/releases/latest",
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`فشل الاتصال بالخادم: ${response.status}`);
    }

    const release = await response.json();
    const latestVersion = release.tag_name ? release.tag_name.replace(/^v/, "") : "";
    const downloadUrl = release.html_url || defaultResult.downloadUrl;
    const releaseNotes = release.body || "";
    const assets = Array.isArray(release.assets) ? release.assets : [];
    const { directUrl, assetName } = findDirectAsset(assets);

    if (!latestVersion) {
      return defaultResult;
    }

    // Compare semantic versions
    const hasUpdate = isNewerVersion(CURRENT_VERSION, latestVersion);

    return {
      hasUpdate,
      latestVersion,
      downloadUrl,
      directDownloadUrl: directUrl || downloadUrl,
      assetName: assetName || `update-v${latestVersion}`,
      releaseNotes,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("انتهت مهلة الاتصال. يرجى التأكد من سرعة الإنترنت والمحاولة مجدداً.");
    }
    console.error("Error checking for updates:", error);
    throw error;
  }
}

/**
 * Triggers direct in-app file download without opening the GitHub repository page.
 */
export function triggerDirectDownload(url: string, fileName?: string) {
  if (!url) return;
  const link = document.createElement("a");
  link.href = url;
  if (fileName) {
    link.download = fileName;
  }
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Simple semantic version comparison: returns true if v2 > v1
 */
function isNewerVersion(v1: string, v2: string): boolean {
  const parts1 = v1.split(".").map(Number);
  const parts2 = v2.split(".").map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part2 > part1) return true;
    if (part2 < part1) return false;
  }

  return false;
}
