// ==============================================================================
// Luxury App Portal Logic - Sheikh Hajj Ayoub Amine Quran App
// ==============================================================================

// Data for Interactive Showcase Tabs
const SHOWCASE_TABS = {
    mushaf: {
        title: "المصحف المرتل برواية ورش والتظليل التفاعلي",
        desc: "صفحات المصحف الشريف بخط واضح وعالي الدقة مع نظام التظليل الذكي للآيات المتزامن لحظياً مع صوت الشيخ حاج أيوب أمين لمساعدة الكبار والأطفال على الحفظ المتقن.",
        img: "assets/fatiha.jpg",
        features: [
            "تظليل لحظي لكل آية أثناء القراءة بصوت القارئ",
            "إمكانية تكرار الآية وتحديد عدد مرات الإعادة للحفظ والترسيخ",
            "وضعان مخصصان: وضع الكبار المفتوح ووضع ركن الأطفال المقفل"
        ]
    },
    tv: {
        title: "نسخة التلفاز الذكي Android TV & Smart TV",
        desc: "واجهة فائقة الدقة 4K مكبرة ومريحة مخصصة لشاشات التلفاز الذكية وأجهزة TV Box، متوافقة 100% مع أزرار الريموت كنترول لاجتماع العائلة حول تلاوة القرآن الكريم.",
        img: "assets/surah-nas.jpg",
        features: [
            "تحكم كامل عبر ريموت التلفاز والتنقل السهل بين السور والآيات",
            "عرض مكبر ومريح للعين يناسب الجلوس العائلي في غرفة المعيشة",
            "إمكانية تشغيل التلاوات المتتالية تلقائياً دون انقطاع"
        ]
    },
    kids: {
        title: "ركن ألعاب وتحديات الأطفال الهادف",
        desc: "بيئة آمنة وجذابة لربط قلوب الناشئة بالقرآن الكريم من خلال ألعاب ترتيب الآيات، واكتشاف بدايات السور، وجمع النجوم وشجرة الحسنات مع قفل ولي الأمر الصارم.",
        img: "assets/kids-bg.jpg",
        features: [
            "لعبة ترتيب الآيات القرآنية وحفظ ترتيب السور",
            "شجرة الحسنات التفاعلية وجوائز تشجيعية عند إكمال ورد القراءة",
            "قفل أمان إلزامي بكلمة مرور الوالدين لمنع إغلاق أو مغادرة التطبيق"
        ]
    },
    offline: {
        title: "تشغيل أوفلاين 100% بدون إنترنت",
        desc: "محرك تخزين محلي ذكي يعطي الأولوية الدائمة للسور المحملة؛ حتى مع وجود الإنترنت، يُشغل التطبيق التلاوة من جهازك فوراً بدون أي تأخير وبدون استهلاك باقة البيانات.",
        img: "assets/surah-nas.jpg",
        features: [
            "تنزيل السور الكاملة بضغطة واحدة إلى الذاكرة المحلية",
            "أولوية التشغيل المحلي الفوري (0 ثانية تحميل و0 استهلاك بيانات)",
            "استقرار كامل في السفر والأماكن ضعيفة أو منعدمة التغطية"
        ]
    }
};

// Platform definitions
const PLATFORM_INFO = {
    'windows': { name: 'Windows للحاسوب', icon: '💻', desc: 'ملف تثبيت مباشر لنظام ويندوز 10 و 11 (EXE)' },
    'android_tv': { name: 'Android TV للتلفاز', icon: '📺', desc: 'حزمة APK مخصصة لشاشات التلفاز الذكية وأجهزة TV Box' },
    'android': { name: 'Android للهاتف', icon: '📱', desc: 'حزمة Universal APK للهواتف والأجهزة اللوحية' },
    'macos': { name: 'macOS للماك', icon: '🍎', desc: 'حزمة DMG لأجهزة آبل ماك (Apple Silicon & Intel)' },
    'linux': { name: 'Linux', icon: '🐧', desc: 'حزمة AppImage المستقلة وتوزيعات لينكس' }
};

// Device Detection
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

function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return "75MB";
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(1) + "MB";
}

// Fetch Live Assets from GitHub Releases
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

// Initialize Tabs
function initShowcaseTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabTitle = document.getElementById('tab-title');
    const tabDesc = document.getElementById('tab-desc');
    const tabFeatures = document.getElementById('tab-features');
    const tabMediaImg = document.getElementById('tab-media-img');
    const mainMockupImg = document.getElementById('main-mockup-img');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const tabKey = btn.getAttribute('data-tab');
            const data = SHOWCASE_TABS[tabKey];
            if (!data) return;

            if (tabTitle) tabTitle.textContent = data.title;
            if (tabDesc) tabDesc.textContent = data.desc;
            if (tabMediaImg) tabMediaImg.src = data.img;
            if (mainMockupImg) mainMockupImg.src = data.img;

            if (tabFeatures) {
                tabFeatures.innerHTML = data.features.map(f => `
                    <li><span class="check-icon">✓</span> ${f}</li>
                `).join('');
            }
        });
    });
}

// Initialize Audio Preview Player
function initAudioPreview() {
    const playBtn = document.getElementById('btn-audio-toggle');
    const audioElem = document.getElementById('preview-audio-elem');
    const waveBars = document.getElementById('wave-bars');

    if (!playBtn || !audioElem) return;

    playBtn.addEventListener('click', () => {
        if (audioElem.paused) {
            audioElem.play().then(() => {
                playBtn.textContent = '⏸';
                if (waveBars) waveBars.style.opacity = '1';
            }).catch(e => {
                console.warn('Audio play prevented:', e);
            });
        } else {
            audioElem.pause();
            playBtn.textContent = '▶';
            if (waveBars) waveBars.style.opacity = '0.4';
        }
    });

    audioElem.addEventListener('ended', () => {
        playBtn.textContent = '▶';
        if (waveBars) waveBars.style.opacity = '0.4';
    });
}

// Initialize Portal Downloads
async function initPortal() {
    initShowcaseTabs();
    initAudioPreview();

    try {
        let data = null;
        try {
            const response = await fetch('releases.json?v=' + Date.now());
            if (response.ok) data = await response.json();
        } catch {
            /* ignore */
        }

        const liveMap = await fetchLiveGitHubAssets();
        const currentPlatform = detectPlatform();
        const info = PLATFORM_INFO[currentPlatform] || PLATFORM_INFO['windows'];

        // Determine best primary download URL
        let downloadUrl = "https://github.com/HAY2023/Amine-H-Ayoub/releases/download/v1.0.0/learn-quran-kids_1.0.0_x64-setup.exe";
        let sizeText = "74.9MB";
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

        // Render Primary Hero Card Content
        const primaryCardContent = document.getElementById('primary-card-content');
        if (primaryCardContent) {
            primaryCardContent.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div style="font-size: 2.5rem; background: rgba(255,255,255,0.08); width: 62px; height: 62px; border-radius: 1.25rem; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(245,158,11,0.3);">${info.icon}</div>
                        <div>
                            <h2 style="font-family: 'Cairo', sans-serif; font-size: 1.4rem; font-weight: 800; color: #fff;">النسخة المقترحة لجهازك (${info.name})</h2>
                            <p style="font-size: 0.9rem; color: var(--text-muted);">${info.desc} • الحجم: ${sizeText}</p>
                        </div>
                    </div>
                    <span style="background: rgba(16,185,129,0.2); color: #34d399; border: 1px solid rgba(16,185,129,0.4); padding: 0.35rem 0.85rem; border-radius: 50px; font-weight: 800; font-size: 0.85rem;">الإصدار ${versionText}</span>
                </div>
                
                <a href="${downloadUrl}" class="btn-download-master" id="hero-dl-btn">
                    <span>⬇️</span>
                    <span>تحميل النسخة لجهازك الآن مجاناً</span>
                </a>
            `;
        }

        // Update Download Hub Cards with Live URLs
        const setCardUrl = (id, pltKey, defaultUrl) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (liveMap && liveMap[pltKey]) {
                el.href = liveMap[pltKey].url;
            } else if (data?.platforms?.[pltKey]?.releases?.[0]?.url) {
                el.href = data.platforms[pltKey].releases[0].url;
            } else {
                el.href = defaultUrl;
            }
        };

        setCardUrl('card-dl-windows', 'windows', 'https://github.com/HAY2023/Amine-H-Ayoub/releases/download/v1.0.0/learn-quran-kids_1.0.0_x64-setup.exe');
        setCardUrl('card-dl-tv', 'android_tv', 'https://github.com/HAY2023/Amine-H-Ayoub/releases/download/v1.0.0/app-universal-debug.apk');
        setCardUrl('card-dl-android', 'android', 'https://github.com/HAY2023/Amine-H-Ayoub/releases/download/v1.0.0/app-universal-debug.apk');
        setCardUrl('card-dl-macos', 'macos', 'https://github.com/HAY2023/Amine-H-Ayoub/releases/latest');
        setCardUrl('card-dl-linux', 'linux', 'https://github.com/HAY2023/Amine-H-Ayoub/releases/latest');

    } catch (e) {
        console.error('Error initializing portal:', e);
    }
}

document.addEventListener('DOMContentLoaded', initPortal);
