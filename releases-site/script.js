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
    'android': { name: 'Android', icon: '📱' },
    'windows': { name: 'Windows', icon: '💻' },
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
        if (typeof child === 'string' || typeof child === 'number') {
            el.appendChild(document.createTextNode(child));
        } else if (child instanceof Node) {
            el.appendChild(child);
        }
    });
    return el;
}

async function loadReleases() {
    try {
        const response = await fetch('releases.json?v=' + Date.now());
        const data = await response.json();
        
        document.getElementById('site-title').innerText = data.site_settings.site_title;

        // 1. التحقق من الصيانة
        if (data.site_settings.maintenance_mode) {
            document.getElementById('maintenance-msg').classList.remove('hidden');
            return;
        }

        const userScore = getRolloutScore();
        let currentKey = detectPlatform();
        
        // إذا كان النظام غير مدعوم، لا نجعله الرئيسي بل نعرض القائمة فقط
        if (currentKey !== 'unknown' && data.platforms[currentKey] && data.platforms[currentKey].active) {
            renderPrimary(data, currentKey, userScore);
        }

        renderOthers(data, currentKey, userScore);

    } catch (e) {
        console.error('Error loading releases:', e);
        document.getElementById('site-title').innerText = 'حدث خطأ في تحميل البيانات';
    }
}

// --- الفرز الزمني الدقيق للإصدارات ---
function getLatestActiveRelease(releasesArray) {
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

    const card = createElement('div', { className: 'card' });
    
    card.appendChild(createElement('div', { style: 'font-size: 4rem; margin-bottom: 1rem;' }, info.icon));
    
    const title = createElement('h2', {}, `نسخة ${info.name} ${release.version}`);
    
    if (platform.force_update) {
        title.appendChild(createElement('span', { className: 'badge-force' }, 'تحديث إجباري'));
    }
    card.appendChild(title);
    
    card.appendChild(createElement('p', { style: 'color: var(--text-muted); font-size: 0.9rem;' }, `تاريخ الإصدار: ${release.date}`));

    if (platform.min_supported_version) {
        card.appendChild(createElement('span', { className: 'note-min' }, `الحد الأدنى المدعوم: ${platform.min_supported_version}`));
    }

    if (isAllowedByRollout) {
        const btnContainer = createElement('div', {});
        const btn = createElement('a', { 
            href: release.url, 
            className: 'btn' 
        }, `تحميل التطبيق الآن (${release.size || 'مجهول'})`);
        btnContainer.appendChild(btn);
        card.appendChild(btnContainer);

        if (key === 'android' && !isMobile() && data.site_settings.show_qr_for_mobile) {
            const qrWrapper = createElement('div', { id: 'qrcode-container' });
            qrWrapper.appendChild(createElement('p', { style: 'font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1rem;' }, 'امسح الرمز لتحميل التطبيق مباشرة على هاتفك'));
            const qrTarget = createElement('div', { id: 'qrcode' });
            qrWrapper.appendChild(qrTarget);
            card.appendChild(qrWrapper);
        }
    } else {
        const waitBox = createElement('div', { className: 'rollout-wait' });
        waitBox.appendChild(createElement('h3', { style: 'margin-bottom: 0.5rem' }, 'التحديث سيصلك قريبًا ⏳'));
        waitBox.appendChild(createElement('p', {}, 'يتم الآن توزيع هذا التحديث تدريجياً. تفقد الصفحة لاحقاً.'));
        card.appendChild(waitBox);
    }

    // بناء سجل التغييرات بأمان
    if (release.changelog && release.changelog.length > 0) {
        const changeDiv = createElement('div', { className: 'changelog' });
        changeDiv.appendChild(createElement('strong', {}, 'ما الجديد؟'));
        const ul = createElement('ul', {});
        release.changelog.forEach(change => {
            ul.appendChild(createElement('li', {}, change)); // حماية من الحقن
        });
        changeDiv.appendChild(ul);
        card.appendChild(changeDiv);
    }

    container.appendChild(card);
    container.classList.remove('hidden');

    if (isAllowedByRollout && key === 'android' && !isMobile() && data.site_settings.show_qr_for_mobile) {
        new QRCode(document.getElementById("qrcode"), { text: release.url, width: 150, height: 150 });
    }
}

// --- بناء المنصات الأخرى بأمان ---
function renderOthers(data, currentKey, userScore) {
    const container = document.getElementById('other-platforms-grid');
    const wrapper = document.getElementById('other-platforms');
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
            href: isAllowedByRollout ? release.url : '#',
            className: 'platform-card'
        });
        
        if (!isAllowedByRollout) {
            a.onclick = (e) => { e.preventDefault(); alert('التحديث سيصلك قريباً'); };
        }

        a.appendChild(createElement('div', { className: 'platform-icon' }, info.icon));
        
        const textDiv = createElement('div', {});
        const h4 = createElement('h4', { style: 'margin-bottom: 0.2rem;' }, info.name);
        if (platform.force_update) {
            h4.appendChild(createElement('span', { className: 'badge-force' }, 'إجباري'));
        }
        textDiv.appendChild(h4);
        textDiv.appendChild(createElement('p', { style: 'font-size: 0.8rem; color: var(--text-muted);' }, `${release.version} ${isAllowedByRollout ? '' : '(قريباً)'}`));
        
        a.appendChild(textDiv);
        container.appendChild(a);
    }

    if (hasItems) {
        wrapper.classList.remove('hidden');
    }
}

document.addEventListener('DOMContentLoaded', loadReleases);
