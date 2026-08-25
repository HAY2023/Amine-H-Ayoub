// Configuration & Constants
const GITHUB_REPO = "HAY2023/Amine-H-Ayoub";
const SUPABASE_URL = "https://qmnvzxjsokibsmgpfeln.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtbnZ6eGpzb2tpYnNtZ3BmZWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3MTY2NTYsImV4cCI6MjEwMjI5MjY1Nn0.HuEYBLDADNuFkNNDUIJ2v8fYAxDUXenFROgpBEgpj7c";

// Fallback release URLs for v1.0.0-an experience
const FALLBACK_ASSETS = {
    windows: `https://github.com/${GITHUB_REPO}/releases/latest`,
    android: `https://github.com/${GITHUB_REPO}/releases/latest`,
    aab: `https://github.com/${GITHUB_REPO}/releases/latest`,
    ios: `https://github.com/${GITHUB_REPO}/releases/latest`,
    tv: `https://github.com/${GITHUB_REPO}/releases/latest`,
    macos: `https://github.com/${GITHUB_REPO}/releases/latest`,
    linux: `https://github.com/${GITHUB_REPO}/releases/latest`
};

let liveAssets = { ...FALLBACK_ASSETS };

// Detect OS
function detectUserOS() {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const platform = window.navigator.platform?.toLowerCase() || '';

    if (/android tv|smart-tv|googletv|androidtv/i.test(userAgent)) return 'tv';
    if (/iphone|ipad|ipod/i.test(userAgent) || (platform.includes('mac') && navigator.maxTouchPoints > 1)) return 'ios';
    if (/android/i.test(userAgent)) return 'android';
    if (/mac/i.test(platform) || /macintosh/i.test(userAgent)) return 'macos';
    if (/linux/i.test(platform) || /linux/i.test(userAgent)) return 'linux';
    if (/win/i.test(platform) || /windows/i.test(userAgent)) return 'windows';
    return 'windows';
}

// Fetch live assets from GitHub API
async function fetchLiveGitHubAssets() {
    try {
        const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
        if (!res.ok) return;
        const data = await res.json();
        if (!data.assets || !Array.isArray(data.assets)) return;

        data.assets.forEach(asset => {
            const name = asset.name.toLowerCase();
            const url = asset.browser_download_url;

            if (name.endsWith('.exe')) liveAssets.windows = url;
            else if (name.endsWith('.apk')) {
                liveAssets.android = url;
                liveAssets.tv = url;
            } else if (name.endsWith('.aab')) {
                liveAssets.aab = url;
            } else if (name.endsWith('.ipa')) {
                liveAssets.ios = url;
            } else if (name.endsWith('.dmg')) liveAssets.macos = url;
            else if (name.endsWith('.appimage')) liveAssets.linux = url;
        });

        updatePlatformLinks();
    } catch (e) {
        console.debug("Live release assets fallback active:", e);
    }
}

function updatePlatformLinks() {
    const w = document.getElementById("card-dl-windows");
    const tv = document.getElementById("card-dl-tv");
    const a = document.getElementById("card-dl-android");
    const aab = document.getElementById("card-dl-aab");
    const ios = document.getElementById("card-dl-ios");
    const m = document.getElementById("card-dl-macos");
    const l = document.getElementById("card-dl-linux");

    if (w) w.href = liveAssets.windows;
    if (tv) tv.href = liveAssets.tv;
    if (a) a.href = liveAssets.android;
    if (aab) aab.href = liveAssets.aab;
    if (ios) ios.href = liveAssets.ios;
    if (m) m.href = liveAssets.macos;
    if (l) l.href = liveAssets.linux;
}

// Render Primary Hero Download Card
function renderPrimaryCard(os) {
    const container = document.getElementById("primary-card-content");
    if (!container) return;

    let icon = "💻";
    let title = "تنزيل نسخة ويندوز الرسمية (Windows PC)";
    let subtitle = "حزمة .EXE الذاتية والمستقلة — تعمل 100% بدون إنترنت";
    let link = liveAssets.windows;

    if (os === 'ios') {
        icon = "🍏";
        title = "تنزيل حزمة آيفون وآيباد (iOS IPA)";
        subtitle = "حزمة IPA الرسمية متوافقة مع أجهزة iPhone و iPad";
        link = liveAssets.ios;
    } else if (os === 'android') {
        icon = "📱";
        title = "تنزيل نسخة أندرويد (Android APK)";
        subtitle = "تثبيت مباشر لجميع هواتف وأجهزة أندرويد اللوحية";
        link = liveAssets.android;
    } else if (os === 'tv') {
        icon = "📺";
        title = "تنزيل نسخة التلفاز الذكي (Android TV 4K)";
        subtitle = "حزمة APK متوافقة تماماً مع شاشات سمارت وريموت التحكم";
        link = liveAssets.tv;
    } else if (os === 'macos') {
        icon = "🍎";
        title = "تنزيل نسخة الماك (macOS DMG)";
        subtitle = "حزمة DMG متوافقة مع معالجات M1/M2/M3 و Intel";
        link = liveAssets.macos;
    } else if (os === 'linux') {
        icon = "🐧";
        title = "تنزيل نسخة لينكس (Linux AppImage)";
        subtitle = "تشغيل مباشر لجميع توزيعات لينكس بحزمة AppImage";
        link = liveAssets.linux;
    }

    container.innerHTML = `
        <a href="${link}" class="btn-download-master" id="primary-dl-btn">
            <span style="font-size: 1.6rem;">${icon}</span>
            <span>${title}</span>
        </a>
        <p style="text-align: center; font-size: 0.88rem; color: var(--text-muted); margin-top: 0.85rem;">
            ${subtitle}
        </p>
    `;
}

// Interactive Showcase Tabs Data
const TABS_DATA = {
    recitations: {
        title: "المصحف المرتل وقائمة التلاوات",
        desc: "واجهة أنيقة وسلسة تعرض سور القرآن الكريم برواية ورش، مع إمكانية البحث الفوري، وزر تحميل السور أوفلاين للتشغيل بدون إنترنت، ونظام جمع النقاط التشجيعي.",
        features: [
            "تلاوة كاملة بصوت القارئ حاج أيوب أمين برواية ورش",
            "زر (تحميل الكل / جاهز أوفلاين) للتشغيل دون نت",
            "ركن ألعاب الأطفال مدمج مع حماية ولي الأمر"
        ],
        image: "assets/screen-desktop-home.png"
    },
    kids: {
        title: "ركن ألعاب وتحديات الأطفال الأسطورية",
        desc: "ألعاب تفاعلية شيقة (سباق النور، لغز الآيات، ترتيب السور، وتحدي التجويد) تشجع الأطفال على حفظ القرآن ومراجعته بمتعة وحماس.",
        features: [
            "ألعاب قرآنية ممتعة وهادفة تحبب الأطفال في كتاب الله",
            "نظام فتح الألعاب تدريجياً عبر الاستماع للتلاوة",
            "مؤثرات بصرية وصوتية محفزة للأبطال الصغار"
        ],
        image: "assets/screen-mobile-kids.png"
    },
    desktop_kids: {
        title: "ساحة ألعاب وتحديات الكمبيوتر والشاشات",
        desc: "عرض عريض مذهل لألعاب الأطفال والتحديات على الشاشات الكبيرة وأجهزة الكمبيوتر والتلفاز بدقة عالية وتحكم سلس.",
        features: [
            "دعم الشاشات الكبيرة 4K والحواسيب بدقة فائقة",
            "متجر الأوسمة والمكافآت التنافسي",
            "لوحة متابعة إنجازات وتطور حفظ الطفل"
        ],
        image: "assets/screen-desktop-kids.png"
    },
    settings: {
        title: "لوحة التحكم وقفل الوالدين الذكي",
        desc: "إعدادات شاملة تتيح التحكم في الحسابات، قفل الخروج بكلمة سر للوالدين، وإدارة التنزيلات، وفتح قناة اليوتيوب والتواصل مع الدعم الفني.",
        features: [
            "حماية خروج الطفل برمز PIN مخصص لولي الأمر",
            "إدارة سعة التخزين وحذف السور المحملة بسهولة",
            "تواصل مباشر مع الدعم الفني وقناة القارئ على يوتيوب"
        ],
        image: "assets/screen-desktop-settings.png"
    }
};

function setupShowcaseTabs() {
    const tabBtns = document.querySelectorAll(".tab-btn");
    const titleElem = document.getElementById("tab-title");
    const descElem = document.getElementById("tab-desc");
    const featList = document.getElementById("tab-features");
    const imgElem = document.getElementById("tab-media-img");

    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            tabBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const tabKey = btn.getAttribute("data-tab");
            const data = TABS_DATA[tabKey];
            if (!data) return;

            if (titleElem) titleElem.textContent = data.title;
            if (descElem) descElem.textContent = data.desc;
            if (imgElem) {
                imgElem.style.opacity = "0.2";
                setTimeout(() => {
                    imgElem.src = data.image;
                    imgElem.style.opacity = "1";
                }, 150);
            }
            if (featList) {
                featList.innerHTML = data.features.map(f => `
                    <li><span class="check-icon">✓</span> ${f}</li>
                `).join("");
            }
        });
    });
}

// Audio Preview Controller
function setupAudioPreview() {
    const playBtn = document.getElementById("btn-audio-toggle");
    const audioElem = document.getElementById("preview-audio-elem");
    const waveElem = document.getElementById("wave-bars");

    if (!playBtn || !audioElem) return;

    playBtn.addEventListener("click", () => {
        if (audioElem.paused) {
            audioElem.play().then(() => {
                playBtn.textContent = "⏸";
                if (waveElem) waveElem.style.opacity = "1";
            }).catch(e => console.debug("Audio preview play info:", e));
        } else {
            audioElem.pause();
            playBtn.textContent = "▶";
            if (waveElem) waveElem.style.opacity = "0.4";
        }
    });

    audioElem.addEventListener("ended", () => {
        playBtn.textContent = "▶";
        if (waveElem) waveElem.style.opacity = "0.4";
    });
}

// ══════════════════════════════════════════════════════════════
// LIVE SUPABASE SUPPORT CHAT FOR WEBSITE VISITORS (NO BOT)
// ══════════════════════════════════════════════════════════════
let supabaseClient = null;
let siteConvId = null;
let siteVisitorDeviceId = null;

function getOrCreateVisitorId() {
    let id = localStorage.getItem("site_visitor_device_id");
    if (!id) {
        id = `web_visitor_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        localStorage.setItem("site_visitor_device_id", id);
    }
    return id;
}

function initSupabaseSupport() {
    if (typeof window.supabase === "undefined" || !window.supabase.createClient) return;

    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
        siteVisitorDeviceId = getOrCreateVisitorId();
        setupChatElements();
    } catch (e) {
        console.debug("Supabase init note:", e);
    }
}

function setupChatElements() {
    const openBtn = document.getElementById("btn-open-site-support");
    const closeBtn = document.getElementById("btn-close-site-support");
    const overlay = document.getElementById("site-support-overlay");
    const drawer = document.getElementById("site-support-drawer");
    const sendBtn = document.getElementById("btn-site-send");
    const inputElem = document.getElementById("site-support-input");
    const attachBtn = document.getElementById("btn-site-attach");
    const fileInput = document.getElementById("site-file-input");

    if (openBtn && drawer) {
        openBtn.addEventListener("click", () => {
            drawer.classList.remove("hidden");
            loadOrInitConversation();
        });
    }

    if (closeBtn && drawer) {
        closeBtn.addEventListener("click", () => drawer.classList.add("hidden"));
    }
    if (overlay && drawer) {
        overlay.addEventListener("click", () => drawer.classList.add("hidden"));
    }

    if (sendBtn && inputElem) {
        sendBtn.addEventListener("click", sendUserMessage);
        inputElem.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendUserMessage();
            }
        });
    }

    if (attachBtn && fileInput) {
        attachBtn.addEventListener("click", () => fileInput.click());
        fileInput.addEventListener("change", (e) => {
            if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
            }
        });
    }
}

async function loadOrInitConversation() {
    if (!supabaseClient) return;
    const msgContainer = document.getElementById("site-support-messages");
    if (!msgContainer) return;

    msgContainer.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:2rem; font-size:0.9rem;">جاري الاتصال بالمشرف...</div>`;

    try {
        let { data: conv } = await supabaseClient
            .from("support_conversations")
            .select("id")
            .eq("device_id", siteVisitorDeviceId)
            .maybeSingle();

        if (!conv) {
            const { data } = await supabaseClient
                .from("support_conversations")
                .insert({ device_id: siteVisitorDeviceId, user_name: "زائر الموقع" })
                .select("id")
                .maybeSingle();
            if (data) conv = data;
        }

        if (conv?.id) {
            siteConvId = conv.id;
            loadMessages();
            subscribeToMessages();
        }
    } catch (e) {
        console.debug("Init chat error:", e);
        msgContainer.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:2rem; font-size:0.9rem;">أهلاً بك! اكتب رسالتك وسيتواصل معك المشرف مباشرة.</div>`;
    }
}

async function loadMessages() {
    if (!supabaseClient || !siteConvId) return;
    const msgContainer = document.getElementById("site-support-messages");
    if (!msgContainer) return;

    const { data: msgs } = await supabaseClient
        .from("support_messages")
        .select("id, sender, body, created_at")
        .eq("conversation_id", siteConvId)
        .order("created_at", { ascending: true });

    if (!msgs || msgs.length === 0) {
        msgContainer.innerHTML = `
            <div style="text-align:center; color:#94a3b8; padding:3rem 1.5rem; space-y: 1rem;">
                <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">💬</div>
                <h4 style="font-family:'Cairo',sans-serif; color:#f8fafc; font-size:1.15rem; font-weight:800;">مرحباً بك في الدعم الفني</h4>
                <p style="font-size:0.85rem; line-height:1.6; max-width:280px; margin:0.5rem auto 0;">
                    اطرح استفسارك أو ملاحظتك وسيرد عليك المشرف مباشرة. يمكنك أيضاً إرفاق لقطات شاشة.
                </p>
            </div>
        `;
        return;
    }

    msgContainer.innerHTML = "";
    msgs.forEach(m => renderMessageBubble(m, false));
    msgContainer.scrollTop = msgContainer.scrollHeight;
}

let sitePollTimer = null;

async function loadMessagesSilently() {
    if (!supabaseClient || !siteConvId) return;
    try {
        const { data: msgs } = await supabaseClient
            .from("support_messages")
            .select("id, sender, body, created_at")
            .eq("conversation_id", siteConvId)
            .order("created_at", { ascending: true });

        if (msgs && msgs.length > 0) {
            msgs.forEach(m => renderMessageBubble(m, false));
        }
    } catch (e) {
        /* ignore */
    }
}

function subscribeToMessages() {
    if (!supabaseClient || !siteConvId) return;

    if (!sitePollTimer) {
        sitePollTimer = setInterval(loadMessagesSilently, 2500);
    }

    supabaseClient
        .channel(`site_support_${siteConvId}`)
        .on("postgres_changes", {
            event: "INSERT",
            schema: "public",
            table: "support_messages",
            filter: `conversation_id=eq.${siteConvId}`
        }, (payload) => {
            const newMsg = payload.new;
            renderMessageBubble(newMsg, true);
        })
        .subscribe();
}

function renderMessageBubble(m, shouldScroll) {
    const msgContainer = document.getElementById("site-support-messages");
    if (!msgContainer) return;

    // Remove empty placeholder if present
    if (msgContainer.querySelector("h4")) {
        msgContainer.innerHTML = "";
    }

    // Avoid duplicate render
    if (document.getElementById(`msg-${m.id}`)) return;

    const isUser = m.sender === "user";
    const bubble = document.createElement("div");
    bubble.id = `msg-${m.id || Date.now()}`;
    bubble.className = `msg-bubble ${isUser ? "msg-user" : "msg-admin"}`;

    const timeStr = new Date(m.created_at || Date.now()).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });

    let contentHtml = "";
    if (m.body && m.body.startsWith("[IMAGE] ")) {
        const src = m.body.replace("[IMAGE] ", "").trim();
        contentHtml = `<img src="${src}" alt="صورة مرفقة" style="max-width:100%; border-radius:12px; display:block; margin-top:4px;">`;
    } else {
        contentHtml = `<p style="white-space:pre-wrap; word-break:break-word;">${m.body}</p>`;
    }

    bubble.innerHTML = `
        <div style="font-size:0.72rem; opacity:0.8; font-weight:800; margin-bottom:2px;">${isUser ? "أنت" : "المشرف"}</div>
        ${contentHtml}
        <div class="msg-time">${timeStr}</div>
    `;

    msgContainer.appendChild(bubble);
    if (shouldScroll || isUser) {
        msgContainer.scrollTop = msgContainer.scrollHeight;
    }
}

async function sendUserMessage() {
    const inputElem = document.getElementById("site-support-input");
    if (!inputElem || !inputElem.value.trim() || !supabaseClient) return;

    const text = inputElem.value.trim();
    inputElem.value = "";

    const tempMsg = {
        id: `opt-${Date.now()}`,
        sender: "user",
        body: text,
        created_at: new Date().toISOString()
    };
    renderMessageBubble(tempMsg, true);

    try {
        if (siteConvId) {
            await supabaseClient.from("support_messages").insert({
                conversation_id: siteConvId,
                sender: "user",
                body: text
            });
            await supabaseClient.from("support_conversations").update({
                last_message: text,
                last_message_at: new Date().toISOString()
            }).eq("id", siteConvId);
        }
    } catch (e) {
        console.debug("Send note:", e);
    }
}

async function handleFileUpload(file) {
    if (!file || !file.type.startsWith("image/") || !supabaseClient) return;

    const toBase64 = (f) => new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = rej;
        r.readAsDataURL(f);
    });

    try {
        const base64 = await toBase64(file);
        const tempMsg = {
            id: `opt-${Date.now()}`,
            sender: "user",
            body: `[IMAGE] ${base64}`,
            created_at: new Date().toISOString()
        };
        renderMessageBubble(tempMsg, true);

        if (siteConvId) {
            await supabaseClient.from("support_messages").insert({
                conversation_id: siteConvId,
                sender: "user",
                body: `[IMAGE] ${base64}`
            });
            await supabaseClient.from("support_conversations").update({
                last_message: "📷 صورة مرفقة",
                last_message_at: new Date().toISOString()
            }).eq("id", siteConvId);
        }
    } catch (e) {
        console.debug("Upload note:", e);
    }
}

// Initialization on DOM Load
document.addEventListener("DOMContentLoaded", () => {
    const userOS = detectUserOS();
    renderPrimaryCard(userOS);
    setupShowcaseTabs();
    setupAudioPreview();
    fetchLiveGitHubAssets();
    initSupabaseSupport();
});
