import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * وجوه الأطفال «صور» مرسومة (SVG) — أطفال كرتونيون ملوّنون، لا إيموجي ولا صور خارجية،
 * فتعمل دون إنترنت وتكبُر بلا فقدان جودة. المجانية أطفال عاديون؛ المميّزة أطفال بأزياء فخمة.
 */
const SKIN: Record<string, string> = { light: "#F6D3AE", tan: "#E7B085", brown: "#C6875A", deep: "#A2673B" };
const HAIR: Record<string, string> = { black: "#2E2A28", brown: "#6B4A2B", blonde: "#DDAE45", auburn: "#9E4B2E" };

type HairStyle = "short" | "spiky" | "curly" | "bob" | "ponytail" | "bald";
type Acc =
  | "none" | "bow" | "crown" | "tiara" | "bigcrown" | "mask" | "ninja" | "gradcap"
  | "beret" | "detective" | "helmet" | "sunglasses" | "starglasses" | "freckles" | "headband" | "wink";

interface Cfg { skin: string; hair: HairStyle; hc: string; acc: Acc; }

/** إعداد كل وجه: لون البشرة + الشعر + الزينة. */
export const AVATAR_CONFIG: Record<string, Cfg> = {
  // ── مجانية: أطفال عاديون بألوان متنوّعة ──
  boy:   { skin: SKIN.tan,   hair: "short",    hc: HAIR.brown,  acc: "none" },
  girl:  { skin: SKIN.light, hair: "ponytail", hc: HAIR.auburn, acc: "bow" },
  child: { skin: SKIN.brown, hair: "curly",    hc: HAIR.black,  acc: "none" },
  baby:  { skin: SKIN.light, hair: "bald",     hc: HAIR.brown,  acc: "none" },
  smile: { skin: SKIN.light, hair: "short",    hc: HAIR.blonde, acc: "freckles" },
  grin:  { skin: SKIN.tan,   hair: "spiky",    hc: HAIR.black,  acc: "none" },
  cool:  { skin: SKIN.tan,   hair: "short",    hc: HAIR.brown,  acc: "sunglasses" },
  wow:   { skin: SKIN.deep,  hair: "curly",    hc: HAIR.black,  acc: "none" },
  wink:  { skin: SKIN.light, hair: "bob",      hc: HAIR.brown,  acc: "wink" },
  happy: { skin: SKIN.tan,   hair: "bob",      hc: HAIR.auburn, acc: "none" },
  // ── مميّزة (بالنجوم): أطفال بأزياء فخمة ──
  hero:      { skin: SKIN.tan,   hair: "short",    hc: HAIR.black,  acc: "mask" },
  ninja:     { skin: SKIN.light, hair: "short",    hc: HAIR.black,  acc: "ninja" },
  artist:    { skin: SKIN.tan,   hair: "short",    hc: HAIR.brown,  acc: "beret" },
  graduate:  { skin: SKIN.brown, hair: "short",    hc: HAIR.black,  acc: "gradcap" },
  detective: { skin: SKIN.light, hair: "short",    hc: HAIR.auburn, acc: "detective" },
  astronaut: { skin: SKIN.tan,   hair: "short",    hc: HAIR.brown,  acc: "helmet" },
  king:      { skin: SKIN.tan,   hair: "short",    hc: HAIR.brown,  acc: "crown" },
  queen:     { skin: SKIN.light, hair: "bob",      hc: HAIR.blonde, acc: "tiara" },
  superstar: { skin: SKIN.tan,   hair: "spiky",    hc: HAIR.black,  acc: "starglasses" },
  champion:  { skin: SKIN.brown, hair: "short",    hc: HAIR.black,  acc: "headband" },
  royal:     { skin: SKIN.light, hair: "bob",      hc: HAIR.auburn, acc: "bigcrown" },
};

const GOLD = "#F4C63B", GOLD_D = "#D9A62B";
const eyesHidden = (a: Acc) => a === "sunglasses" || a === "starglasses" || a === "mask";

/** شعر خلفي (يُرسم قبل الوجه): كعكة/ذيل جانبي. */
function BackHair({ hair, hc }: { hair: HairStyle; hc: string }) {
  if (hair === "bob") return <path d="M18 52 Q16 78 32 80 L32 50 Z M82 52 Q84 78 68 80 L68 50 Z" fill={hc} />;
  if (hair === "ponytail") return <><circle cx="78" cy="44" r="9" fill={hc} /><path d="M74 44 Q92 52 84 74" stroke={hc} strokeWidth="9" fill="none" strokeLinecap="round" /></>;
  return null;
}

/** شعر أمامي فوق الجبهة. */
function FrontHair({ hair, hc }: { hair: HairStyle; hc: string }) {
  switch (hair) {
    case "short":
      return <path d="M22 50 C22 27 78 27 78 50 C73 39 64 34 50 34 C36 34 27 39 22 50 Z" fill={hc} />;
    case "spiky":
      return <path d="M22 50 L27 28 L35 43 L43 25 L51 43 L59 25 L67 43 L78 50 C73 40 64 34 50 34 C36 34 27 41 22 50 Z" fill={hc} />;
    case "curly":
      return <g fill={hc}><circle cx="30" cy="37" r="9" /><circle cx="42" cy="31" r="10" /><circle cx="58" cy="31" r="10" /><circle cx="70" cy="37" r="9" /><path d="M22 52 C24 41 30 35 42 35 L58 35 C70 35 76 41 78 52 C70 42 30 42 22 52 Z" /></g>;
    case "bob":
      return <path d="M22 50 C22 28 78 28 78 50 C72 40 63 35 50 35 C37 35 28 40 22 50 Z" fill={hc} />;
    case "ponytail":
      return <path d="M24 49 C24 29 76 29 76 49 C71 39 62 34 50 34 C38 34 29 39 24 49 Z" fill={hc} />;
    case "bald":
      return <path d="M46 32 q4 -7 8 -1" stroke={hc} strokeWidth="2.5" fill="none" strokeLinecap="round" />;
  }
}

/** الزينة (تُرسم فوق كل شيء). */
function Accessory({ acc }: { acc: Acc }) {
  switch (acc) {
    case "bow":
      return <g transform="translate(70 30)"><path d="M0 0 L-10 -6 L-10 6 Z" fill="#EE6FA2" /><path d="M0 0 L10 -6 L10 6 Z" fill="#EE6FA2" /><circle r="3.2" fill="#D64D8A" /></g>;
    case "crown":
      return <g><path d="M32 32 L38 17 L50 28 L62 17 L68 32 Z" fill={GOLD} stroke={GOLD_D} strokeWidth="1.6" strokeLinejoin="round" /><circle cx="38" cy="18" r="2" fill="#E7533B" /><circle cx="50" cy="27" r="2.3" fill="#3BA6E7" /><circle cx="62" cy="18" r="2" fill="#43C06B" /></g>;
    case "tiara":
      return <g><path d="M34 32 Q50 18 66 32" fill="none" stroke={GOLD} strokeWidth="4" strokeLinecap="round" /><circle cx="50" cy="21" r="3.2" fill="#7BD1F0" stroke={GOLD_D} strokeWidth="1" /></g>;
    case "bigcrown":
      return <g><rect x="30" y="28" width="40" height="7" rx="2" fill={GOLD_D} /><path d="M30 30 L37 12 L50 25 L63 12 L70 30 Z" fill={GOLD} stroke={GOLD_D} strokeWidth="1.6" strokeLinejoin="round" /><circle cx="37" cy="14" r="2.4" fill="#E7533B" /><circle cx="50" cy="24" r="2.8" fill="#7BD1F0" /><circle cx="63" cy="14" r="2.4" fill="#43C06B" /><circle cx="50" cy="32" r="2" fill="#fff" /></g>;
    case "mask":
      return <g><path d="M26 49 Q50 43 74 49 L74 56 Q50 63 26 56 Z" fill="#3D7BE0" /><ellipse cx="41" cy="53" rx="4.5" ry="3.2" fill="#fff" /><ellipse cx="59" cy="53" rx="4.5" ry="3.2" fill="#fff" /><circle cx="41" cy="53" r="2" fill="#2A2A2A" /><circle cx="59" cy="53" r="2" fill="#2A2A2A" /></g>;
    case "ninja":
      return <g><rect x="16" y="42" width="68" height="9" rx="2" fill="#C0392B" /><path d="M16 46 l-9 3 M16 50 l-9 8" stroke="#C0392B" strokeWidth="3.5" strokeLinecap="round" /><rect x="46" y="45" width="8" height="3" rx="1.5" fill="#8E2A20" /><path d="M31 61 Q50 67 69 61 L69 82 Q50 87 31 82 Z" fill="#2B2B2B" /></g>;
    case "gradcap":
      return <g><polygon points="50,16 82,27 50,38 18,27" fill="#2B2B36" /><polygon points="50,38 50,31 62,26.5 62,33.5" fill="#22222C" /><line x1="70" y1="24" x2="72" y2="41" stroke={GOLD} strokeWidth="1.6" /><circle cx="72" cy="42" r="2.6" fill={GOLD} /></g>;
    case "beret":
      return <g transform="rotate(-8 54 27)"><ellipse cx="54" cy="27" rx="22" ry="9" fill="#C0392B" /><circle cx="54" cy="19" r="2.6" fill="#8E2D22" /></g>;
    case "detective":
      return <g><path d="M24 42 Q50 20 76 42 Z" fill="#7A6A55" /><rect x="19" y="40" width="62" height="6" rx="3" fill="#6B5B47" /></g>;
    case "helmet":
      return <g><circle cx="50" cy="50" r="35" fill="#BFE0FF" opacity="0.28" /><circle cx="50" cy="50" r="35" fill="none" stroke="#9CC7EE" strokeWidth="3" /><rect x="26" y="82" width="48" height="14" rx="5" fill="#ECECEC" stroke="#C9C9C9" strokeWidth="1.5" /></g>;
    case "sunglasses":
      return <g fill="#232323"><rect x="29" y="48" width="17" height="11" rx="4" /><rect x="54" y="48" width="17" height="11" rx="4" /><rect x="46" y="51" width="8" height="3" /></g>;
    case "starglasses":
      return <g><rect x="29" y="48" width="17" height="11" rx="4" fill="#232323" /><rect x="54" y="48" width="17" height="11" rx="4" fill="#232323" /><rect x="46" y="51" width="8" height="3" fill="#232323" /><path d="M37.5 49 l1.3 2.6 2.9 .3 -2.1 2 .6 2.8 -2.6 -1.4 -2.6 1.4 .6 -2.8 -2.1 -2 2.9 -.3 Z" fill={GOLD} /></g>;
    case "headband":
      return <g><rect x="18" y="40" width="64" height="7" rx="3" fill="#E67E22" /><path d="M50 39 l-4 6 h8 Z" fill={GOLD} /></g>;
    default:
      return null;
  }
}

/** ملامح الوجه: عينان + خدّان + ابتسامة (تتكيّف مع الزينة). */
function Face({ acc }: { acc: Acc }) {
  const hideEyes = eyesHidden(acc);
  const smile = acc === "ninja"
    ? null
    : <path d="M42 65 Q50 72 58 65" fill="none" stroke="#9C5A46" strokeWidth="2.6" strokeLinecap="round" />;
  return (
    <>
      <circle cx="35" cy="60" r="4.5" fill="#F49B94" opacity="0.5" />
      <circle cx="65" cy="60" r="4.5" fill="#F49B94" opacity="0.5" />
      {!hideEyes && (
        <>
          <circle cx="41" cy="53" r="3.4" fill="#3A2A22" />
          {acc === "wink"
            ? <path d="M55 53 q4 3.5 8 0" stroke="#3A2A22" strokeWidth="2.8" fill="none" strokeLinecap="round" />
            : <circle cx="59" cy="53" r="3.4" fill="#3A2A22" />}
          <circle cx="42.2" cy="51.8" r="1.1" fill="#fff" />
          {acc !== "wink" && <circle cx="60.2" cy="51.8" r="1.1" fill="#fff" />}
        </>
      )}
      {acc === "freckles" && (
        <g fill="#C4805A"><circle cx="33" cy="61" r="1" /><circle cx="37" cy="63" r="1" /><circle cx="63" cy="63" r="1" /><circle cx="67" cy="61" r="1" /></g>
      )}
      {smile}
    </>
  );
}

/** يعرض وجه الطفل كرسم SVG يملأ الصندوق المُمرَّر عبر className (w-N h-N). */
export default function Avatar({ name, className }: { name: string; className?: string }) {
  const [imgFailed, setImgFailed] = useState(false);

  if (!name || name === "default") {
    return (
      <svg viewBox="0 0 100 100" className={cn("select-none bg-secondary/50", className)} role="img" aria-label="default">
        <circle cx="50" cy="40" r="20" fill="#a0a0a0" opacity="0.5" />
        <path d="M20 90 Q50 60 80 90" stroke="#a0a0a0" strokeWidth="15" strokeLinecap="round" fill="none" opacity="0.5" />
      </svg>
    );
  }

  const cleanName = name.startsWith("av-") ? name.replace(/^av-/, "") : name;
  const cfg = AVATAR_CONFIG[cleanName];

  if (imgFailed) {
    if (cfg) {
      return (
        <svg viewBox="0 0 100 100" className={cn("select-none bg-secondary/30 rounded-full", className)} role="img" aria-label={name}>
          <BackHair hair={cfg.hair} hc={cfg.hc} />
          <circle cx="50" cy="54" r="28" fill={cfg.skin} />
          <FrontHair hair={cfg.hair} hc={cfg.hc} />
          <Face acc={cfg.acc} />
          <Accessory acc={cfg.acc} />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 100 100" className={cn("select-none bg-secondary/50 rounded-full", className)} role="img" aria-label="default">
        <circle cx="50" cy="40" r="20" fill="#a0a0a0" opacity="0.5" />
        <path d="M20 90 Q50 60 80 90" stroke="#a0a0a0" strokeWidth="15" strokeLinecap="round" fill="none" opacity="0.5" />
      </svg>
    );
  }

  const legacyMap: Record<string, string> = {
    boy: "img-boy-scholar",
    girl: "img-girl-scholar",
    child: "img-boy-reciter",
    baby: "img-girl-gold",
    hero: "img-boy-knight",
    ninja: "img-boy-turban",
    king: "img-boy-bisht",
    queen: "img-girl-emerald",
    "img-boy-1": "img-boy-scholar",
    "img-boy-2": "img-boy-scholar",
    "img-boy-3": "img-boy-knight",
    "img-boy-4": "img-boy-turban",
    "img-boy-5": "img-boy-bisht",
    "img-boy-6": "img-boy-reciter",
    "img-boy-7": "img-boy-scholar",
    "img-boy-8": "img-boy-knight",
    "img-boy-9": "img-boy-turban",
    "img-girl-1": "img-girl-scholar",
    "img-girl-2": "img-girl-gold",
    "img-girl-3": "img-girl-emerald",
    "img-girl-4": "img-girl-scholar",
    "img-girl-5": "img-girl-gold",
    "img-girl-6": "img-girl-purple",
    "img-girl-7": "img-girl-emerald",
  };

  const mapped = legacyMap[cleanName] || cleanName;
  const imageFile = mapped.startsWith("img-") ? mapped : "img-boy-scholar";

  // ملاحظة: ملفات الأفاتار هي بصيغة JPEG على الرغم من امتداد .png —
  // يتم تحميلها بامتداد .jpg الصحيح لتجنّب مشاكل توافق المتصفحات
  return (
    <img
      src={`/avatars/${imageFile}.jpg`}
      alt={imageFile}
      className={cn("object-contain rounded-full shadow-sm w-full h-full bg-accent/10 p-0.5", className)}
      loading="lazy"
      onError={() => setImgFailed(true)}
    />
  );
}
