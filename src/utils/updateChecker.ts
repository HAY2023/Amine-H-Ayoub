export const CURRENT_VERSION = "1.0.0-104";

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

/**
 * Finds the most suitable release asset file based on platform.
 */
function findDirectAsset(assets: Array<{ name: string; browser_download_url: string }>): { directUrl: string; assetName: string } {
  if (!assets || !assets.length) {
    return { directUrl: "", assetName: "" };
  }

  const platform = getPlatform();

  if (platform === "ios") {
    const ipa = assets.find(a => a.name.endsWith(".ipa"));
    if (ipa) return { directUrl: ipa.browser_download_url, assetName: ipa.name };
  } else if (platform === "android") {
    const apk = assets.find(a => a.name.endsWith(".apk") && !a.name.includes("unsigned")) || assets.find(a => a.name.endsWith(".apk"));
    if (apk) return { directUrl: apk.browser_download_url, assetName: apk.name };
    const aab = assets.find(a => a.name.endsWith(".aab"));
    if (aab) return { directUrl: aab.browser_download_url, assetName: aab.name };
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
 * Parses version strings like "1.0.0-100" or "v1.0.1" into numeric segments.
 */
function parseVersion(v: string): number[] {
  const cleaned = v.replace(/^v/i, "").trim();
  const parts = cleaned.split(/[\.-]/).map((p) => {
    const num = parseInt(p, 10);
    return isNaN(num) ? 0 : num;
  });
  return parts;
}

/**
 * Robust semantic version comparison: returns true if latest > current
 */
export function isNewerVersion(current: string, latest: string): boolean {
  const cParts = parseVersion(current);
  const lParts = parseVersion(latest);
  const maxLen = Math.max(cParts.length, lParts.length);

  for (let i = 0; i < maxLen; i++) {
    const c = cParts[i] ?? 0;
    const l = lParts[i] ?? 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
}

/**
 * Checks GitHub releases and fallback sources to verify app updates.
 * Tries: 1) GitHub latest release, 2) GitHub all releases, 3) HuggingFace releases.json fallback.
 */
export async function checkForUpdates(): Promise<UpdateInfo> {
  const defaultResult: UpdateInfo = {
    hasUpdate: false,
    latestVersion: CURRENT_VERSION,
    downloadUrl: "https://github.com/HAY2023/Amine-H-Ayoub/releases/latest",
    directDownloadUrl: "https://github.com/HAY2023/Amine-H-Ayoub/releases/latest",
    assetName: `hajj-ayoub-amine-v${CURRENT_VERSION}`,
  };

  // فحص الاتصال بالإنترنت
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("لا يوجد اتصال بالإنترنت. يرجى الاتصال والمحاولة مجدداً.");
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    let releaseData: any = null;

    // المصدر الأول: GitHub Latest Release
    try {
      const response = await fetch(
        "https://api.github.com/repos/HAY2023/Amine-H-Ayoub/releases/latest",
        {
          headers: { Accept: "application/vnd.github.v3+json" },
          signal: controller.signal,
        }
      );
      if (response.ok) {
        releaseData = await response.json();
      }
    } catch {
      /* fallback to next source */
    }

    // المصدر الثاني: GitHub All Releases
    if (!releaseData) {
      try {
        const response2 = await fetch(
          "https://api.github.com/repos/HAY2023/Amine-H-Ayoub/releases",
          {
            headers: { Accept: "application/vnd.github.v3+json" },
            signal: controller.signal,
          }
        );
        if (response2.ok) {
          const list = await response2.json();
          if (Array.isArray(list) && list.length > 0) {
            releaseData = list[0];
          }
        }
      } catch {
        /* ignore */
      }
    }

    // المصدر الثالث: ملف releases.json على HuggingFace (احتياطي عند حظر GitHub)
    if (!releaseData) {
      try {
        const hfResponse = await fetch(
          "https://huggingface.co/datasets/hammoualiyoucef20/quran-audio/resolve/main/releases.json",
          { signal: controller.signal }
        );
        if (hfResponse.ok) {
          const hfData = await hfResponse.json();
          if (hfData && hfData.tag_name) {
            releaseData = hfData;
          }
        }
      } catch {
        /* ignore */
      }
    }

    clearTimeout(timeout);

    if (!releaseData) {
      return defaultResult;
    }

    const latestVersion = releaseData.tag_name ? releaseData.tag_name.replace(/^v/, "") : CURRENT_VERSION;
    const downloadUrl = releaseData.html_url || defaultResult.downloadUrl;
    const releaseNotes = releaseData.body || "";
    const assets = Array.isArray(releaseData.assets) ? releaseData.assets : [];
    const { directUrl, assetName } = findDirectAsset(assets);

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
    return defaultResult;
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
