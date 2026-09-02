

// طرق القراءات القرآنية المتواترة - Quranic Recitation Methods
// يتضمن القراءات العشر المتواترة وأشهر الطرق المنسوبة لكل قارئ

export interface RecitationMethod {
  id: string;
  name: string;
  reader: string;       // القارئ (الإمام)
  narrator: string;     // الراوي
  description: string;
  origin: string;       // البلد / المنطقة
  category: "سبع" | "عشر"; // من السبع أو العشر المتواترة
  popular: boolean;
  color: string;        // لون تمييزي للبطاقة
  icon: string;         // إيموجي
}

export const RECITATION_METHODS: RecitationMethod[] = [
  // === القراءات السبع ===
  {
    id: "hafs",
    name: "حفص عن عاصم",
    reader: "عاصم بن أبي النجود",
    narrator: "حفص بن سليمان",
    description: "أشهر القراءات وأكثرها انتشاراً في العالم الإسلامي. يقرأ بها أغلب المسلمين اليوم.",
    origin: "الكوفة",
    category: "سبع",
    popular: true,
    color: "from-emerald-500 to-teal-600",
    icon: "🌟",
  },
  {
    id: "shuaba",
    name: "شعبة عن عاصم",
    reader: "عاصم بن أبي النجود",
    narrator: "شعبة بن عياش",
    description: "الرواية الثانية عن الإمام عاصم، تختلف عن حفص في بعض الكلمات والحركات.",
    origin: "الكوفة",
    category: "سبع",
    popular: false,
    color: "from-emerald-600 to-green-700",
    icon: "📗",
  },
  {
    id: "qalun",
    name: "قالون عن نافع",
    reader: "نافع بن عبد الرحمن",
    narrator: "عيسى بن مينا (قالون)",
    description: "منتشرة في ليبيا وتونس وأجزاء من موريتانيا. تتميز بقواعد خاصة في المد والإدغام.",
    origin: "المدينة المنورة",
    category: "سبع",
    popular: true,
    color: "from-blue-500 to-indigo-600",
    icon: "📘",
  },
  {
    id: "warsh",
    name: "ورش عن نافع",
    reader: "نافع بن عبد الرحمن",
    narrator: "عثمان بن سعيد (ورش)",
    description: "منتشرة في المغرب والجزائر وغرب أفريقيا. تتميز بنقل حركة الهمزة والتقليل.",
    origin: "المدينة المنورة",
    category: "سبع",
    popular: true,
    color: "from-amber-500 to-orange-600",
    icon: "📙",
  },
  {
    id: "bazzi",
    name: "البزي عن ابن كثير",
    reader: "عبد الله بن كثير",
    narrator: "أحمد بن محمد البزي",
    description: "من قراءات أهل مكة المكرمة. تتميز بصلة ميم الجمع وإدغام خاص.",
    origin: "مكة المكرمة",
    category: "سبع",
    popular: false,
    color: "from-purple-500 to-violet-600",
    icon: "📕",
  },
  {
    id: "qunbul",
    name: "قنبل عن ابن كثير",
    reader: "عبد الله بن كثير",
    narrator: "محمد بن عبد الرحمن (قنبل)",
    description: "الرواية الثانية عن ابن كثير المكي. قريبة من البزي مع فروق يسيرة.",
    origin: "مكة المكرمة",
    category: "سبع",
    popular: false,
    color: "from-purple-600 to-fuchsia-700",
    icon: "📓",
  },
  {
    id: "duri-abu-amr",
    name: "الدوري عن أبي عمرو",
    reader: "أبو عمرو بن العلاء",
    narrator: "حفص بن عمر الدوري",
    description: "منتشرة في السودان وأجزاء من شرق أفريقيا. تتميز بالإدغام الكبير.",
    origin: "البصرة",
    category: "سبع",
    popular: true,
    color: "from-cyan-500 to-blue-600",
    icon: "📒",
  },
  {
    id: "susi",
    name: "السوسي عن أبي عمرو",
    reader: "أبو عمرو بن العلاء",
    narrator: "صالح بن زياد السوسي",
    description: "تتميز بالإبدال والإدغام. قريبة من رواية الدوري مع فروق في بعض الأصول.",
    origin: "البصرة",
    category: "سبع",
    popular: false,
    color: "from-cyan-600 to-teal-700",
    icon: "📔",
  },
  {
    id: "hisham",
    name: "هشام عن ابن عامر",
    reader: "عبد الله بن عامر",
    narrator: "هشام بن عمار",
    description: "من قراءات أهل الشام. تتميز بقواعد خاصة في الهمز والإمالة.",
    origin: "دمشق",
    category: "سبع",
    popular: false,
    color: "from-rose-500 to-pink-600",
    icon: "📖",
  },
  {
    id: "ibn-dhakwan",
    name: "ابن ذكوان عن ابن عامر",
    reader: "عبد الله بن عامر",
    narrator: "عبد الله بن أحمد بن ذكوان",
    description: "الرواية الثانية عن ابن عامر الشامي. منتشرة في بعض بلاد الشام.",
    origin: "دمشق",
    category: "سبع",
    popular: false,
    color: "from-rose-600 to-red-700",
    icon: "📚",
  },
  {
    id: "khalaf-hamza",
    name: "خلف عن حمزة",
    reader: "حمزة بن حبيب الزيات",
    narrator: "خلف بن هشام",
    description: "تتميز بالإمالة الكبرى وترقيق الراء في مواضع كثيرة.",
    origin: "الكوفة",
    category: "سبع",
    popular: false,
    color: "from-yellow-500 to-amber-600",
    icon: "📜",
  },
  {
    id: "khallad",
    name: "خلاد عن حمزة",
    reader: "حمزة بن حبيب الزيات",
    narrator: "خلاد بن خالد",
    description: "الرواية الثانية عن حمزة الزيات. تتميز بالسكت على الساكن قبل الهمز.",
    origin: "الكوفة",
    category: "سبع",
    popular: false,
    color: "from-yellow-600 to-orange-700",
    icon: "📋",
  },
  {
    id: "layth",
    name: "الليث عن الكسائي",
    reader: "علي بن حمزة الكسائي",
    narrator: "الليث بن خالد",
    description: "من قراءات أهل الكوفة. تتميز بالإمالة في مواضع كثيرة.",
    origin: "الكوفة",
    category: "سبع",
    popular: false,
    color: "from-lime-500 to-green-600",
    icon: "🕮",
  },
  {
    id: "duri-kisai",
    name: "الدوري عن الكسائي",
    reader: "علي بن حمزة الكسائي",
    narrator: "حفص بن عمر الدوري",
    description: "الرواية الثانية عن الكسائي. يشترك راويها مع الدوري عن أبي عمرو.",
    origin: "الكوفة",
    category: "سبع",
    popular: false,
    color: "from-lime-600 to-emerald-700",
    icon: "📃",
  },

  // === القراءات الثلاث المكملة للعشر ===
  {
    id: "ibn-jammaz",
    name: "ابن جماز عن أبي جعفر",
    reader: "يزيد بن القعقاع (أبو جعفر)",
    narrator: "عيسى بن وردان",
    description: "من القراءات العشر المتواترة. إمام أهل المدينة في القراءة.",
    origin: "المدينة المنورة",
    category: "عشر",
    popular: false,
    color: "from-slate-500 to-gray-600",
    icon: "🕋",
  },
  {
    id: "ibn-wardan",
    name: "ابن وردان عن أبي جعفر",
    reader: "يزيد بن القعقاع (أبو جعفر)",
    narrator: "سليمان بن جماز",
    description: "الرواية الثانية عن أبي جعفر المدني.",
    origin: "المدينة المنورة",
    category: "عشر",
    popular: false,
    color: "from-slate-600 to-zinc-700",
    icon: "🏛️",
  },
  {
    id: "ruways",
    name: "رويس عن يعقوب",
    reader: "يعقوب بن إسحاق الحضرمي",
    narrator: "محمد بن المتوكل (رويس)",
    description: "من القراءات العشر. إمام أهل البصرة بعد أبي عمرو.",
    origin: "البصرة",
    category: "عشر",
    popular: false,
    color: "from-teal-500 to-cyan-600",
    icon: "🌊",
  },
  {
    id: "rawh",
    name: "روح عن يعقوب",
    reader: "يعقوب بن إسحاق الحضرمي",
    narrator: "روح بن عبد المؤمن",
    description: "الرواية الثانية عن يعقوب الحضرمي.",
    origin: "البصرة",
    category: "عشر",
    popular: false,
    color: "from-teal-600 to-emerald-700",
    icon: "🌿",
  },
  {
    id: "ishaq",
    name: "إسحاق عن خلف العاشر",
    reader: "خلف بن هشام البزار",
    narrator: "إسحاق بن إبراهيم",
    description: "القراءة العاشرة. خلف البزار له قراءة مستقلة غير روايته عن حمزة.",
    origin: "بغداد",
    category: "عشر",
    popular: false,
    color: "from-indigo-500 to-purple-600",
    icon: "✨",
  },
  {
    id: "idris",
    name: "إدريس عن خلف العاشر",
    reader: "خلف بن هشام البزار",
    narrator: "إدريس بن عبد الكريم",
    description: "الرواية الثانية عن خلف العاشر.",
    origin: "بغداد",
    category: "عشر",
    popular: false,
    color: "from-indigo-600 to-blue-700",
    icon: "🌙",
  },
];

// مفتاح التخزين المحلي
const SELECTED_METHOD_KEY = "quran:selectedRecitationMethod";

export function getSelectedMethod(): string {
  if (typeof window === "undefined") return "hafs";
  return localStorage.getItem(SELECTED_METHOD_KEY) || "hafs";
}

export function saveSelectedMethod(methodId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SELECTED_METHOD_KEY, methodId);
}

export function getMethodById(id: string): RecitationMethod | undefined {
  return RECITATION_METHODS.find(m => m.id === id);
}
