// --- توليد أو قراءة Device Fingerprint للـ Rollout ---
function getDeviceFingerprint() {
    let fp = localStorage.getItem('device_fp');
    if (!fp) {
        fp = Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem('device_fp', fp);
    }
    return fp;
}

// دالة Hash بسيطة (مجموع أكواد الأحرف % 100)
function getRolloutScore() {
    const fp = getDeviceFingerprint();
    let sum = 0;
    for (let i = 0; i < fp.length; i++) {
        sum += fp.charCodeAt(i);
    }
    return (sum % 100) + 1; // رقم من 1 إلى 100
}

// --- التعرف على المنصة ---
function detectPlatform() {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('android')) return 'android';
    if (ua.includes('win')) return 'windows';
    if (ua.includes('mac')) return 'macos';
    if (ua.includes('linux')) return 'linux';
    return 'unknown';
}

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

const PLATFORM_INFO = {
    'android': { name: 'Android (للهاتف)', icon: '📱' },
    'windows': { name: 'Windows (للحاسوب)', icon: '💻' },
    'macos': { name: 'macOS', icon: '🍎' },
    'linux': { name: 'Linux', icon: '🐧' },
    'unknown': { name: 'تطبيق', icon: '📦' }
};

// --- دالة مساعدة لإنشاء العناصر بأمان (تمنع XSS) ---
function createElement(tag, attributes = {}, ...children) {
    const el = document.createElement(tag);
    for (let key in attributes) {
        if (key === 'className') el.className = attributes[key];
        else if (key === 'html') el.innerHTML = attributes[key];
        else el.setAttribute(key, attributes[key]);
    }
    children.forEach(child => {
        if (typeof child === 'string' || child === 'number') {
            el.appendChild(document.createTextNode(child));
        } else if (child instanceof Node) {
            el.appendChild(child);
        }
    });
    return el;
}

/**
 * جلب الأصول المتاحة حياً من GitHub Releases لتفادي أي خطأ 404
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
        let data;
        try {
            const response = await fetch('releases.json?v=' + Date.now());
            if (!response.ok) throw new Error("Network response was not ok");
            data = await response.json();
        } catch (fetchError) {
            console.warn('Fetch failed, using local fallback data:', fetchError);
            data = {
              "site_settings": {
                "site_title": "تحميل التطبيق",
                "auto_detect_platform": true,
                "show_qr_for_mobile": true,
                "maintenance_mode": false
              },
              "platforms": {
                "windows": {
                  "active": true,
                  "rollout_percentage": 100,
                  "releases": [{
                      "version": "v1.0.0-100",
                      "date": "2026-08-20",
                      "url": "https://github.com/HAY2023/Amine-H-Ayoub/releases/latest",
                      "size": "74.9MB",
                      "active": true
                  }]
                },
                "android": {
                  "active": true,
                  "rollout_percentage": 100,
                  "releases": [{
                      "version": "v1.0.0-100",
                      "date": "2026-08-20",
                      "url": "https://github.com/HAY2023/Amine-H-Ayoub/releases/latest",
                      "size": "225MB",
                      "active": true
                  }]
                }
              }
            };
        }

        // دمج الروابط المباشرة الحية من GitHub Releases لتفادي أي 404
        try {
            const liveMap = await fetchLiveGitHubAssets();
            if (liveMap) {
                for (const [plt, assetInfo] of Object.entries(liveMap)) {
                    if (data.platforms[plt] && data.platforms[plt].releases && data.platforms[plt].releases[0]) {
                        data.platforms[plt].releases[0].url = assetInfo.url;
                        if (assetInfo.size) data.platforms[plt].releases[0].size = assetInfo.size;
                    }
                }
            }
        } catch {
            /* ignore */
        }
        
        // 1. التحقق من الصيانة
        if (data.site_settings && data.site_settings.maintenance_mode) {
            document.getElementById('maintenance-msg').classList.remove('hidden');
            document.getElementById('hero-section').classList.add('hidden');
            return;
        }

        const userScore = getRolloutScore();
        let currentKey = detectPlatform();
        
        // إذا كان النظام غير مدعوم، نعرض ويندوز بشكل افتراضي
        if (currentKey === 'unknown' || !data.platforms[currentKey] || !data.platforms[currentKey].active) {
            if (data.platforms['windows'] && data.platforms['windows'].active) currentKey = 'windows';
            else if (data.platforms['android'] && data.platforms['android'].active) currentKey = 'android';
        }
        
        if (currentKey !== 'unknown' && data.platforms[currentKey] && data.platforms[currentKey].active) {
            renderPrimary(data, currentKey, userScore);
        }

        renderOthers(data, currentKey, userScore);

    } catch (e) {
        console.error('Error loading releases:', e);
    }
}

// --- الفرز الزمني الدقيق للإصدارات ---
function getLatestActiveRelease(releasesArray) {
    if (!releasesArray || !Array.isArray(releasesArray)) return null;
    return [...releasesArray]
        .filter(r => r.active === true)
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
}

// --- بناء المنصة الرئيسية بأمان ---
function renderPrimary(data, key, userScore) {
    const platform = data.platforms[key];
    const release = getLatestActiveRelease(platform.releases);
    if (!release) return;

    const info = PLATFORM_INFO[key];
    const isAllowedByRollout = userScore <= platform.rollout_percentage;
    const container = document.getElementById('primary-platform');
    container.innerHTML = ''; // تنظيف

    const titleDiv = createElement('div', { style: 'display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;' });
    titleDiv.appendChild(createElement('div', { style: 'font-size: 3rem;' }, info.icon));
    
    const h2 = createElement('h2', { style: 'font-size: 1.8rem; font-family: "Cairo", sans-serif;' }, `النسخة المقترحة لجهازك`);
    
    if (platform.force_update) {
        h2.appendChild(createElement('span', { style: 'background: #ef4444; color: white; padding: 0.2rem 0.8rem; border-radius: 1rem; font-size: 0.8rem; margin-right: 0.5rem; vertical-align: middle;' }, 'هام'));
    }
    titleDiv.appendChild(h2);
    container.appendChild(titleDiv);
    
    const detailsDiv = createElement('div', { style: 'margin-bottom: 1.5rem; color: var(--text-muted); line-height: 1.8;' });
    detailsDiv.appendChild(createElement('p', {}, `نسخة ${info.name} - إصدار ${release.version || 'v1.0.0-100'}`));
    detailsDiv.appendChild(createElement('p', {}, `تاريخ الإصدار: ${release.date} | الحجم: ${release.size || '75MB'}`));
    container.appendChild(detailsDiv);

    if (platform.min_supported_version) {
        container.appendChild(createElement('span', { className: 'note-min' }, `* الحد الأدنى المدعوم: ${platform.min_supported_version}`));
    }

    if (isAllowedByRollout) {
        const btnContainer = createElement('div', { style: 'margin-top: 1.5rem; display: flex; flex-direction: column; gap: 1rem;' });
        
        const btn = createElement('a', { 
            href: release.url || "https://github.com/HAY2023/Amine-H-Ayoub/releases/latest", 
            className: 'btn-magic' 
        });
        btn.appendChild(createElement('span', { className: 'icon' }, '✨'));
        btn.appendChild(createElement('span', {}, `حمّل الآن مجاناً`));
        
        btnContainer.appendChild(btn);

        // Web PWA Button for instant access
        const pwaBtn = createElement('a', {
            href: "https://learn-quran-kids.pages.dev",
            target: "_blank",
            style: 'text-align: center; font-size: 0.95rem; color: var(--primary-dark); text-decoration: underline; margin-top: 0.5rem; font-weight: bold;'
        }, 'أو افتح التطبيق مباشرة في المتصفح (PWA)');
        btnContainer.appendChild(pwaBtn);

        container.appendChild(btnContainer);

        if (key === 'android' && !isMobile() && data.site_settings && data.site_settings.show_qr_for_mobile) {
            const qrWrapper = createElement('div', { id: 'qrcode-container' });
            qrWrapper.appendChild(createElement('p', { style: 'font-size: 1rem; color: var(--text-main); font-weight: bold; margin-bottom: 0.5rem;' }, 'أو امسح الرمز بكاميرا هاتفك'));
            qrWrapper.appendChild(createElement('p', { style: 'font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1rem;' }, 'لتحميل التطبيق مباشرة على الهاتف'));
            const qrTarget = createElement('div', { id: 'qrcode' });
            qrWrapper.appendChild(qrTarget);
            container.appendChild(qrWrapper);
        }
    } else {
        const waitBox = createElement('div', { style: 'background: rgba(245, 158, 11, 0.1); padding: 1.5rem; border-radius: 1rem; border: 1px dashed #f59e0b; margin-top: 1rem; color: #b45309;' });
        waitBox.appendChild(createElement('h3', { style: 'margin-bottom: 0.5rem; font-family: "Cairo", sans-serif;' }, 'التحديث سيصلك قريبًا ⏳'));
        waitBox.appendChild(createElement('p', {}, 'يتم الآن توزيع هذا التحديث تدريجياً لضمان الجودة. تفقد الصفحة لاحقاً.'));
        container.appendChild(waitBox);
    }

    container.classList.remove('hidden');

    if (isAllowedByRollout && key === 'android' && !isMobile() && data.site_settings && data.site_settings.show_qr_for_mobile) {
        if (typeof QRCode !== "undefined") {
            new QRCode(document.getElementById("qrcode"), { text: release.url, width: 160, height: 160, colorDark : "#064e3b", colorLight : "#ffffff" });
        }
    }
}

// --- بناء المنصات الأخرى بأمان ---
function renderOthers(data, currentKey, userScore) {
    const container = document.getElementById('other-platforms-grid');
    const wrapper = document.getElementById('other-platforms');
    if (!container || !wrapper) return;
    container.innerHTML = '';
    let hasItems = false;

    for (const [key, platform] of Object.entries(data.platforms)) {
        if (!platform.active || key === currentKey) continue;
        
        const release = getLatestActiveRelease(platform.releases);
        if (!release) continue;

        hasItems = true;
        const info = PLATFORM_INFO[key];
        const isAllowedByRollout = userScore <= platform.rollout_percentage;

        const a = createElement('a', { 
            href: isAllowedByRollout ? (release.url || "https://github.com/HAY2023/Amine-H-Ayoub/releases/latest") : '#',
            className: 'glass-card platform-card'
        });
        
        if (!isAllowedByRollout) {
            a.onclick = (e) => { e.preventDefault(); alert('التحديث سيصلك قريباً'); };
        }

        a.appendChild(createElement('div', { className: 'platform-icon' }, info.icon));
        
        const h4 = createElement('h4', {}, info.name);
        a.appendChild(h4);
        
        a.appendChild(createElement('p', {}, `${release.version || 'v1.0.0-100'} ${isAllowedByRollout ? '' : '(قريباً)'}`));
        
        container.appendChild(a);
    }

    if (hasItems) {
        wrapper.classList.remove('hidden');
    }
}

document.addEventListener('DOMContentLoaded', loadReleases);
