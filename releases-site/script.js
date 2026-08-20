// --- التعرف على المنصة وجهاز المستخدم ---
function detectPlatform() {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('android')) {
        if (ua.includes('tv') || ua.includes('smart-tv') || ua.includes('googletv') || ua.includes('box')) {
            return 'android_tv';
        }
        return 'android';
    }
    if (ua.includes('win')) return 'windows';
    if (ua.includes('mac')) return 'macos';
    if (ua.includes('linux')) return 'linux';
    return 'windows';
}

const PLATFORM_INFO = {
    'windows': { name: 'Windows للحاسوب', icon: '💻', desc: 'ملف تثبيت مباشر لنظام ويندوز 10/11' },
    'android_tv': { name: 'Android TV للتلفاز', icon: '📺', desc: 'حزمة APK مخصصة لشاشات التلفاز الذكية وأجهزة TV Box' },
    'android': { name: 'Android للهاتف', icon: '📱', desc: 'حزمة APK الشاملة لهواتف وأجهزة أندرويد اللوحية' },
    'macos': { name: 'macOS للماك', icon: '🍎', desc: 'حزمة DMG لأجهزة آبل ماك (Apple Silicon & Intel)' },
    'linux': { name: 'Linux', icon: '🐧', desc: 'حزمة AppImage المستقلة وتوزيعات لينكس' }
};

/**
 * جلب الأصول وروابط التنزيل الحية مباشرة من GitHub Releases
 */
async function fetchLiveGitHubAssets() {
    try {
        const res = await fetch("https://api.github.com/repos/HAY2023/Amine-H-Ayoub/releases", {
            headers: { Accept: "application/vnd.github.v3+json" }
        });
        if (!res.ok) return null;
        const releases = await res.json();
        if (!Array.isArray(releases) || releases.length === 0) return null;

        const liveMap = {};
        for (const rel of releases) {
            if (!rel.assets || rel.assets.length === 0) continue;
            for (const asset of rel.assets) {
                const name = (asset.name || "").toLowerCase();
                const url = asset.browser_download_url;
                if (!liveMap['windows'] && (name.endsWith('.exe') || name.endsWith('.msi'))) {
                    liveMap['windows'] = { url, version: rel.tag_name, size: formatBytes(asset.size) };
                }
                if (!liveMap['android'] && name.endsWith('.apk')) {
                    liveMap['android'] = { url, version: rel.tag_name, size: formatBytes(asset.size) };
                    liveMap['android_tv'] = { url, version: rel.tag_name, size: formatBytes(asset.size) };
                }
                if (!liveMap['macos'] && name.endsWith('.dmg')) {
                    liveMap['macos'] = { url, version: rel.tag_name, size: formatBytes(asset.size) };
                }
                if (!liveMap['linux'] && (name.endsWith('.appimage') || name.endsWith('.deb'))) {
                    liveMap['linux'] = { url, version: rel.tag_name, size: formatBytes(asset.size) };
                }
            }
        }
        return liveMap;
    } catch {
        return null;
    }
}

function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return "75MB";
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(1) + "MB";
}

async function loadReleases() {
    try {
        let data = null;
        try {
            const response = await fetch('releases.json?v=' + Date.now());
            if (response.ok) data = await response.json();
        } catch {
            /* ignore */
        }

        // Live GitHub Assets lookup
        const liveMap = await fetchLiveGitHubAssets();

        const currentPlatform = detectPlatform();
        const info = PLATFORM_INFO[currentPlatform] || PLATFORM_INFO['windows'];

        // Resolve primary download URL
        let downloadUrl = "https://github.com/HAY2023/Amine-H-Ayoub/releases/latest";
        let sizeText = "75MB";
        let versionText = "v1.0.0-100";

        if (liveMap && liveMap[currentPlatform]) {
            downloadUrl = liveMap[currentPlatform].url;
            sizeText = liveMap[currentPlatform].size || sizeText;
            versionText = liveMap[currentPlatform].version || versionText;
        } else if (data?.platforms?.[currentPlatform]?.releases?.[0]?.url) {
            downloadUrl = data.platforms[currentPlatform].releases[0].url;
            sizeText = data.platforms[currentPlatform].releases[0].size || sizeText;
            versionText = data.platforms[currentPlatform].releases[0].version || versionText;
        }

        // Render Primary Card
        const primaryContainer = document.getElementById('primary-platform');
        if (primaryContainer) {
            primaryContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div style="font-size: 2.5rem; background: rgba(255,255,255,0.1); width: 60px; height: 60px; border-radius: 1.25rem; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.2);">${info.icon}</div>
                        <div>
                            <h2 style="font-family: 'Cairo', sans-serif; font-size: 1.4rem; font-weight: 800; color: #fff;">النسخة المقترحة لجهازك (${info.name})</h2>
                            <p style="font-size: 0.9rem; color: #cbd5e1;">${info.desc} • حجم الملف: ${sizeText}</p>
                        </div>
                    </div>
                    <span style="background: rgba(16,185,129,0.25); color: #34d399; border: 1px solid rgba(16,185,129,0.4); padding: 0.35rem 0.85rem; border-radius: 50px; font-weight: 800; font-size: 0.85rem;">الإصدار ${versionText}</span>
                </div>
                
                <a href="${downloadUrl}" class="btn-magic" id="primary-download-btn">
                    <span>⬇️</span>
                    <span>تحميل النسخة لجهازك الآن مجاناً</span>
                </a>

                <div class="pwa-alt">
                    <a href="https://learn-quran-kids.pages.dev" target="_blank">✨ أو شغّل التطبيق فورياً في المتصفح بنقرة واحدة (PWA) بدون تنزيل</a>
                </div>
            `;
        }

        // Update all platform links in the grid
        const updateLink = (id, pltKey, fallbackUrl) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (liveMap && liveMap[pltKey]) {
                el.href = liveMap[pltKey].url;
            } else if (data?.platforms?.[pltKey]?.releases?.[0]?.url) {
                el.href = data.platforms[pltKey].releases[0].url;
            } else {
                el.href = fallbackUrl;
            }
        };

        updateLink('link-windows', 'windows', 'https://github.com/HAY2023/Amine-H-Ayoub/releases/download/v1.0.0/learn-quran-kids_1.0.0_x64-setup.exe');
        updateLink('link-android-tv', 'android_tv', 'https://github.com/HAY2023/Amine-H-Ayoub/releases/download/v1.0.0/app-universal-debug.apk');
        updateLink('link-android', 'android', 'https://github.com/HAY2023/Amine-H-Ayoub/releases/download/v1.0.0/app-universal-debug.apk');
        updateLink('link-macos', 'macos', 'https://github.com/HAY2023/Amine-H-Ayoub/releases/latest');
        updateLink('link-linux', 'linux', 'https://github.com/HAY2023/Amine-H-Ayoub/releases/latest');

    } catch (e) {
        console.error('Error loading releases:', e);
    }
}

document.addEventListener('DOMContentLoaded', loadReleases);
