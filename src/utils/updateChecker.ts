import { isTauri } from "./tauriUtils";

export const CURRENT_VERSION = "0.1.0";

export interface UpdateInfo {
  hasUpdate: boolean;
  latestVersion: string;
  downloadUrl: string;
  releaseNotes?: string;
}

/**
 * Checks GitHub releases to see if there is a newer version of the desktop app.
 */
export async function checkForUpdates(): Promise<UpdateInfo> {
  const defaultResult: UpdateInfo = {
    hasUpdate: false,
    latestVersion: CURRENT_VERSION,
    downloadUrl: "https://github.com/nedjmamine2-code/learn-quran-kids/releases",
  };

  try {
    const response = await fetch(
      "https://api.github.com/repos/nedjmamine2-code/learn-quran-kids/releases/latest",
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch updates: ${response.statusText}`);
    }

    const release = await response.json();
    const latestVersion = release.tag_name ? release.tag_name.replace(/^v/, "") : "";
    const downloadUrl = release.html_url || defaultResult.downloadUrl;
    const releaseNotes = release.body || "";

    if (!latestVersion) {
      return defaultResult;
    }

    // Compare semantic versions
    const hasUpdate = isNewerVersion(CURRENT_VERSION, latestVersion);

    return {
      hasUpdate,
      latestVersion,
      downloadUrl,
      releaseNotes,
    };
  } catch (error) {
    console.error("Error checking for updates:", error);
    return defaultResult;
  }
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
