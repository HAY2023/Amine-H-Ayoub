import { useState, useEffect, useMemo, useRef } from "react";
import { Sparkles, Trophy, Lightbulb, RefreshCw, CheckCircle2, XCircle, Star, Timer, Shield, Flame, ArrowLeft } from "lucide-react";
import { addCoins, spendCoins, getCoins, formatCoins } from "../data/kidsProfile";
import { GameDef } from "../data/gameCatalog";
import { toast } from "../hooks/use-toast";

interface DetectiveGameProps {
  def: GameDef;
  minSurah?: number;
}

interface DetectiveQuestion {
  tag: string;
  question: string;
  options: { text: string; icon: string; isOdd: boolean; note?: string }[];
  hint: string;
}

const QUESTIONS: DetectiveQuestion[] = [
  {
    tag: "أسرار الفواتح",
    question: "أي سورة من السور التالية لا تبدأ بـ (بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ) في المصحف؟",
    options: [
      { text: "سورة التوبة (براءة)", icon: "🛡️", isOdd: true, note: "سورة التوبة نزلت بالسيف والبراءة من المشركين والمنافقين، فلم تبدأ بآية الأمان والرحمة." },
      { text: "سورة يونس", icon: "🐋", isOdd: false },
      { text: "سورة الأنفال", icon: "⚔️", isOdd: false },
      { text: "سورة هود", icon: "📜", isOdd: false },
    ],
    hint: "تسمى أيضاً سورة (براءة) وهي السورة التاسعة في ترتيب المصحف الشريف!",
  },
  {
    tag: "عجائب البسملة",
    question: "سورة في القرآن الكريم كُتبت فيها البسملة مرتين، إحداهما في أولها والأخرى في ثنايا آياتها، فما هي؟",
    options: [
      { text: "سورة النمل", icon: "🐜", isOdd: true, note: "في الآية 30: (إِنَّهُ مِن سُلَيْمَانَ وَإِنَّهُ بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ)." },
      { text: "سورة النحل", icon: "🐝", isOdd: false },
      { text: "سورة سبأ", icon: "🏛️", isOdd: false },
      { text: "سورة القصص", icon: "📖", isOdd: false },
    ],
    hint: "سورة تحكي قصة كتاب نبي الله سليمان إلى ملكة سبأ بلقيس!",
  },
  {
    tag: "لفظ الجلالة",
    question: "سورة كريمة من سور القرآن الكريم، ذُكر لفظ الجلالة «اللَّه» في كل آية من آياتها دون استثناء؟",
    options: [
      { text: "سورة المجادلة", icon: "⚖️", isOdd: true, note: "سورة المجادلة (22 آية) هي السورة الوحيدة التي ذُكر فيها لفظ الجلالة (الله) في كل آية!" },
      { text: "سورة الحشر", icon: "🏰", isOdd: false },
      { text: "سورة الحديد", icon: "⚙️", isOdd: false },
      { text: "سورة المنافقون", icon: "🎭", isOdd: false },
    ],
    hint: "تبدأ بقوله تعالى: (قَدْ سَمِعَ اللَّهُ قَوْلَ الَّتِي تُجَادِلُكَ فِي زَوْجِهَا) في الجزء 28!",
  },
  {
    tag: "سجدات التلاوة",
    question: "أي سورة من سور القرآن الكريم تتضمن سجدتي تلاوة وليست سجدة واحدة؟",
    options: [
      { text: "سورة الحج", icon: "🕋", isOdd: true, note: "سورة الحج فيها سجدتان: الأولى في الآية 18 والثانية في الآية 77." },
      { text: "سورة السجدة", icon: "🧎", isOdd: false },
      { text: "سورة النجم", icon: "⭐", isOdd: false },
      { text: "سورة مريم", icon: "🌸", isOdd: false },
    ],
    hint: "سورة سُميت باسم الركن الخامس من أركان الإسلام العظيم!",
  },
  {
    tag: "بلاغة الحروف",
    question: "أي من هذه السور القرآنية خلت كلماتها تماماً من حرف (الميم) رغم عظيم بلاغتها؟",
    options: [
      { text: "سورة الكوثر", icon: "💧", isOdd: true, note: "سورة الكوثر (أقصر سور القرآن 3 آيات) لا يوجد في كلماتها حرف الميم إطلاقاً!" },
      { text: "سورة العصر", icon: "⏳", isOdd: false },
      { text: "سورة النصر", icon: "🏆", isOdd: false },
      { text: "سورة الإخلاص", icon: "✨", isOdd: false },
    ],
    hint: "هي أقصر سورة في القرآن الكريم وتعد بثلاث آيات فقط!",
  },
  {
    tag: "الصحابة الكرام",
    question: "من هو الصحابي الجليل الوحيد الذي ذُكر اسمه صريحاً في آيات القرآن الكريم؟",
    options: [
      { text: "زيد بن حارثة", icon: "🌟", isOdd: true, note: "ذُكر اسمه في سورة الأحزاب آية 37: (فَلَمَّا قَضَىٰ زَيْدٌ مِّنْهَا وَطَرًا زَوَّجْنَاكَهَا)." },
      { text: "أبو بكر الصديق", icon: "👑", isOdd: false },
      { text: "عثمان بن عفان", icon: "📜", isOdd: false },
      { text: "علي بن أبي طالب", icon: "⚔️", isOdd: false },
    ],
    hint: "كان يُدعى سابقاً زيد بن محمد قبل تحريم التبني في الإسلام!",
  },
  {
    tag: "ألقاب السور",
    question: "سورة كريمة لُقبت بـ (الفاضحة) لأنها كشفت أسرار ومكائد المنافقين وأسقطت أقنعتهم، فما هي؟",
    options: [
      { text: "سورة التوبة", icon: "🔥", isOdd: true, note: "سماها ابن عباس (الفاضحة) لأنها ظلت تنزل بـ: (ومنهم.. ومنهم..) حتى فضحت المنافقين." },
      { text: "سورة المنافقون", icon: "🎭", isOdd: false },
      { text: "سورة الأحزاب", icon: "🛡️", isOdd: false },
      { text: "سورة الفتح", icon: "🕊️", isOdd: false },
    ],
    hint: "هي السورة التاسعة التي لم تبدأ بالبسملة!",
  },
  {
    tag: "نزول الوحي",
    question: "سورة نزلت على رسول الله ﷺ جملة واحدة ليلاً بمكة وشيعها سبعون ألف ملك يعجّون بالتسبيح؟",
    options: [
      { text: "سورة الأنعام", icon: "🐂", isOdd: true, note: "سورة الأنعام سورة مكية جليلة في العقيدة والتوحيد، شيعها 70 ألف ملك." },
      { text: "سورة البقرة", icon: "📖", isOdd: false },
      { text: "سورة آل عمران", icon: "🕌", isOdd: false },
      { text: "سورة المائدة", icon: "🍇", isOdd: false },
    ],
    hint: "السورة السادسة في ترتيب المصحف وتبدأ بـ (الْحَمْدُ لِلَّهِ الَّذِي خَلَقَ السَّمَاوَاتِ وَالْأَرْضَ)!",
  },
  {
    tag: "أسماء السور",
    question: "سورة من السور سميت بـ (سورة النِّعَم) لكثرة ما فصّل الله فيها من آلائه ونعمه على عباده؟",
    options: [
      { text: "سورة النحل", icon: "🍯", isOdd: true, note: "سورة النحل تسمى سورة النعم لأن الله عدد فيها النعم من المطر والأنعام والخلق والشفاء." },
      { text: "سورة الرحمن", icon: "🌹", isOdd: false },
      { text: "سورة إبراهيم", icon: "🌴", isOdd: false },
      { text: "سورة فاطر", icon: "🕊️", isOdd: false },
    ],
    hint: "سورة فيها ذكر الحشرة المباركة التي يخرج من بطونها شراب مختلف ألوانه فيه شفاء للناس!",
  },
  {
    tag: "فواتح فريدة",
    question: "ما هي السورة الكريمة الوحيدة في القرآن الكريم التي افتُتحت بكلمة (سُورَةٌ)؟",
    options: [
      { text: "سورة النور", icon: "💡", isOdd: true, note: "تبدأ بقوله تعالى: (سُورَةٌ أَنزَلْنَاهَا وَفَرَضْنَاهَا وَأَنزَلْنَا فِيهَا آيَاتٍ بَيِّنَاتٍ)." },
      { text: "سورة الفرقان", icon: "⚖️", isOdd: false },
      { text: "سورة الحجرات", icon: "🌿", isOdd: false },
      { text: "سورة الأنبياء", icon: "📜", isOdd: false },
    ],
    hint: "سورة الآداب والأخلاق وحفظ البيوت، وفيها آية النور الشهيرة!",
  },
  {
    tag: "شهور وأزمنة",
    question: "في أي سورة من القرآن الكريم ورد ذكر اسم شهر (رَمَضَان) صراحةً بالاسم؟",
    options: [
      { text: "سورة البقرة", icon: "🌙", isOdd: true, note: "في الآية 185: (شَهْرُ رَمَضَانَ الَّذِي أُنزِلَ فِيهِ الْقُرْآنُ هُدًى لِّلنَّاسِ)." },
      { text: "سورة القدر", icon: "⭐", isOdd: false },
      { text: "سورة الدخان", icon: "🌌", isOdd: false },
      { text: "سورة التوبة", icon: "📜", isOdd: false },
    ],
    hint: "أطول سورة في المصحف الشريف وثانية سوره ترتيباً!",
  },
  {
    tag: "خواتيم السور",
    question: "أي من هذه السور الكريمة ختمت بذكر اسم نبيين كريمين في آخر آية منها؟",
    options: [
      { text: "سورة الأعلى", icon: "📜", isOdd: true, note: "ختمت بقوله تعالى: (صُحُفِ إِبْرَاهِيمَ وَمُوسَىٰ)." },
      { text: "سورة الغاشية", icon: "🌄", isOdd: false },
      { text: "سورة الشمس", icon: "☀️", isOdd: false },
      { text: "سورة البروج", icon: "🌌", isOdd: false },
    ],
    hint: "سورة تبدأ بـ (سَبِّحِ اسْمَ رَبِّكَ الْأَعْلَى) وهي سورة مفضلة في صلاة الجمعة والعيد!",
  },
  {
    tag: "أسرار النبوة",
    question: "ما هي السورة التي لُقبت بـ (سورة التوديع) لأن الصحابة فهموا منها نعي وأجل النبي ﷺ؟",
    options: [
      { text: "سورة النصر", icon: "🕊️", isOdd: true, note: "بكى ابن عباس وعمر عند نزولها لعلمهما بقرب وفاة رسول الله ﷺ بعد إتمام الدين." },
      { text: "سورة الضحى", icon: "🌅", isOdd: false },
      { text: "سورة الشرح", icon: "❤️", isOdd: false },
      { text: "سورة الفتح", icon: "🏆", isOdd: false },
    ],
    hint: "تبدأ بـ (إِذَا جَاءَ نَصْرُ اللَّهِ وَالْفَتْحُ) وهي آخر سورة نزلت كاملة!",
  },
  {
    tag: "أسماء السور",
    question: "سورة كريمة تسمى في بعض المصاحف والآثار بـ (سورة بني إسرائيل)، فما اسمها الشائع؟",
    options: [
      { text: "سورة الإسراء", icon: "🌌", isOdd: true, note: "سورة الإسراء تسمى أيضاً سورة بني إسرائيل لحديثها المفصل عنهم في بدايتها." },
      { text: "سورة الأنعام", icon: "🐑", isOdd: false },
      { text: "سورة يونس", icon: "🌊", isOdd: false },
      { text: "سورة مريم", icon: "🌸", isOdd: false },
    ],
    hint: "تبدأ بـ (سُبْحَانَ الَّذِي أَسْرَىٰ بِعَبْدِهِ لَيْلًا مِّنَ الْمَسْجِدِ الْحَرَامِ إِلَى الْمَسْجِدِ الْأَقْصَى)!",
  },
  {
    tag: "مخلوقات ناطقة",
    question: "أي من هذه المخلوقات نطق وحذّر قومه بالقرآن فخلد الله موقفه بسورة كاملة تحمل اسمه؟",
    options: [
      { text: "النملة", icon: "🐜", isOdd: true, note: "قالت: (يَا أَيُّهَا النَّمْلُ ادْخُلُوا مَسَاكِنَكُمْ لَا يَحْطِمَنَّكُمْ سُلَيْمَانُ وَجُنُودُهُ وَهُمْ لَا يَشْعُرُونَ)." },
      { text: "الهدهد", icon: "🪶", isOdd: false },
      { text: "النحلة", icon: "🐝", isOdd: false },
      { text: "العنكبوت", icon: "🕸️", isOdd: false },
    ],
    hint: "حشرة صغيرة جداً تعيش في مستعمرات منظمة كلمت قومها فتبسم سليمان ضاحكاً من قولها!",
  },
  {
    tag: "أطوال السور",
    question: "ما هي أطول سورة في جزء عمّ (الجزء الثلاثون) من حيث عدد الآيات؟",
    options: [
      { text: "سورة النازعات", icon: "📜", isOdd: true, note: "سورة النازعات تتكون من 46 آية، وهي أطول سور جزء عمّ بينما النبأ 40 آية وعبس 42 آية." },
      { text: "سورة النبأ", icon: "📖", isOdd: false },
      { text: "سورة عبس", icon: "🌴", isOdd: false },
      { text: "سورة المطففين", icon: "⚖️", isOdd: false },
    ],
    hint: "تبدأ بقسم ملائكي مهيب: (وَالنَّازِعَاتِ غَرْقًا * وَالنَّاشِطَاتِ نَشْطًا) وتتكون من 46 آية!",
  },
  {
    tag: "فضائل السور",
    question: "سورة كريمة لُقبت بـ (المانعة) أو (المنجية) لأنها تجادل عن صاحبها وتنجيه من عذاب القبر؟",
    options: [
      { text: "سورة الملك", icon: "👑", isOdd: true, note: "قال ﷺ: (سورة من القرآن ثلاثون آية شفعت لرجل حتى غفر له: تبارك الذي بيده الملك)." },
      { text: "سورة الواقعة", icon: "⚡", isOdd: false },
      { text: "سورة السجدة", icon: "🧎", isOdd: false },
      { text: "سورة يس", icon: "❤️", isOdd: false },
    ],
    hint: "أول سورة في الجزء التاسع والعشرين وتبدأ بـ (تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ)!",
  },
  {
    tag: "قصص القرآن",
    question: "في أي سورة من سور جزء عمّ ذكرت قصة الملك الظالم وأصحاب الأخدود والفتى المؤمن؟",
    options: [
      { text: "سورة البروج", icon: "🌌", isOdd: true, note: "قال تعالى: (قُتِلَ أَصْحَابُ الْأُخْدُودِ * النَّارِ ذَاتِ الْوَقُودِ * إِذْ هُمْ عَلَيْهَا قُعُودٌ)." },
      { text: "سورة الطارق", icon: "⭐", isOdd: false },
      { text: "سورة البلد", icon: "🏛️", isOdd: false },
      { text: "سورة الفجر", icon: "🌄", isOdd: false },
    ],
    hint: "تبدأ بقسم عظيم: (وَالسَّمَاءِ ذَاتِ الْبُرُوجِ * وَالْيَوْمِ الْمَوْعُودِ)!",
  },
  {
    tag: "أطول الآيات",
    question: "ما هي أطول آية في كتاب الله الكريم كاملاً وتختص بالأحكام المالية والتوثيق والشهادات؟",
    options: [
      { text: "آية الدَّيْن في سورة البقرة", icon: "⚖️", isOdd: true, note: "آية الدين (رقم 282 من سورة البقرة) هي أطول آية في القرآن وتشغل صفحة كاملة بالمصحف." },
      { text: "آية الكرسي في سورة البقرة", icon: "👑", isOdd: false },
      { text: "آية المداينة في النساء", icon: "📜", isOdd: false },
      { text: "آية الوصية في سورة المائدة", icon: "✍️", isOdd: false },
    ],
    hint: "تبدأ بـ (يَا أَيُّهَا الَّذِينَ آمَنُوا إِذَا تَدَايَنتُم بِدَيْنٍ إِلَىٰ أَجَلٍ مُّسَمًّى فَاكْتُبُوهُ)!",
  },
  {
    tag: "استفهامات التوبيخ",
    question: "أي من هذه السور المباركة افتتحت باستفهام تقريعي دون قسم: (أَلَمْ تَرَ كَيْفَ...)؟",
    options: [
      { text: "سورة الفيل", icon: "🐘", isOdd: true, note: "تبدأ بـ: (أَلَمْ تَرَ كَيْفَ فَعَلَ رَبُّكَ بِأَصْحَابِ الْفِيلِ)." },
      { text: "سورة الليل", icon: "🌙", isOdd: false },
      { text: "سورة الفجر", icon: "🌄", isOdd: false },
      { text: "سورة الضحى", icon: "☀️", isOdd: false },
    ],
    hint: "سورة تتحدث عن هلاك أبرهة الأشرم وجيشه بحجارة من سجيل!",
  },
  {
    tag: "أيام مباركة",
    question: "ما هي السورة الوحيدة التي سُميت باسم يوم أسبوعي يجتمع فيه المسلمون لأداء صلاة وخطبة؟",
    options: [
      { text: "سورة الجمعة", icon: "🕌", isOdd: true, note: "سورة الجمعة فيها فرض السعي إلى ذكر الله وترك البيع عند النداء للصلاة." },
      { text: "سورة الفتح", icon: "🕊️", isOdd: false },
      { text: "سورة الحج", icon: "🕋", isOdd: false },
      { text: "سورة النور", icon: "💡", isOdd: false },
    ],
    hint: "خير يوم طلعت عليه الشمس، وفيه صلاة الجمعة المباركة!",
  },
  {
    tag: "كنوز وثروات",
    question: "في أي سورة وردت قصة صاحب الكنوز الطائلة (قارون) وخسف الله به وبداره الأرض؟",
    options: [
      { text: "سورة القصص", icon: "💎", isOdd: true, note: "في سورة القصص: (إِنَّ قَارُونَ كَانَ مِن قَوْمِ مُوسَىٰ فَبَغَىٰ عَلَيْهِمْ وَآتَيْنَاهُ مِنَ الْكُنُوزِ)." },
      { text: "سورة الكهف", icon: "⛰️", isOdd: false },
      { text: "سورة الشعراء", icon: "📜", isOdd: false },
      { text: "سورة النمل", icon: "🐜", isOdd: false },
    ],
    hint: "سورة تحكي قصة موسى من المهد إلى النصر، وتسمى سورة القصص!",
  },
  {
    tag: "ألقاب الأنبياء",
    question: "أي نبي من أنبياء الله الكرام لُقب في القرآن بـ (ذا النون) وذُكر خروجه مغاضباً؟",
    options: [
      { text: "يونس عليه السلام", icon: "🐋", isOdd: true, note: "النون في لغة العرب هو الحوت، وذو النون هو نبي الله يونس عليه السلام صاحب الحوت." },
      { text: "يوسف عليه السلام", icon: "👑", isOdd: false },
      { text: "أيوب عليه السلام", icon: "💧", isOdd: false },
      { text: "زكريا عليه السلام", icon: "🌿", isOdd: false },
    ],
    hint: "نادى في الظلمات: (لَّا إِلَٰهَ إِلَّا أَنتَ سُبْحَانَكَ إِنِّي كُنتُ مِنَ الظَّالِمِينَ)!",
  },
  {
    tag: "أماكن مقدسة",
    question: "ما هو الوادي المقدس المبارك الذي نادى الله فيه نبيه موسى عليه السلام وخلعه لنعليه؟",
    options: [
      { text: "وادي طُوى", icon: "⛰️", isOdd: true, note: "قال تعالى: (إِنِّي أَنَا رَبُّكَ فَاخْلَعْ نَعْلَيْكَ إِنَّكَ بِالْوَادِ الْمُقَدَّسِ طُوًى)." },
      { text: "وادي يثرب", icon: "🌴", isOdd: false },
      { text: "وادي حنين", icon: "🏹", isOdd: false },
      { text: "وادي قريش", icon: "🕋", isOdd: false },
    ],
    hint: "ذُكر اسمه الشريف في سورتي طه والنازعات!",
  },
  {
    tag: "طير ومعجزات",
    question: "ما اسم الطير الذي أرسله الله جنداً على جيش أبرهة حاملاً حجارة من سجيل؟",
    options: [
      { text: "طير أبابيل", icon: "🦅", isOdd: true, note: "قال تعالى في سورة الفيل: (وَأَرْسَلَ عَلَيْهِمْ طَيْرًا أَبَابِيلَ * تَرْمِيهِم بِحِجَارَةٍ مِّن سِجِّيلٍ)." },
      { text: "الهدهد", icon: "🪶", isOdd: false },
      { text: "غراب قابيل", icon: "🐦", isOdd: false },
      { text: "صقر قريش", icon: "🕊️", isOdd: false },
    ],
    hint: "جماعات متتابعة أرسلها الله لحماية بيته الحرام في عام الفيل!",
  },
  {
    tag: "سدود وقرون",
    question: "سورة كريمة ذكر فيها الملك الصالح (ذو القرنين) وبناؤه للردَم العظيم لحبس يأجوج ومأجوج؟",
    options: [
      { text: "سورة الكهف", icon: "⛰️", isOdd: true, note: "في سورة الكهف: (قَالُوا يَا ذَا الْقَرْنَيْنِ إِنَّ يَأْجُوجَ وَمَأْجُوجَ مُفْسِدُونَ فِي الْأَرْضِ)." },
      { text: "سورة مريم", icon: "🌸", isOdd: false },
      { text: "سورة الأنبياء", icon: "📜", isOdd: false },
      { text: "سورة طه", icon: "🌿", isOdd: false },
    ],
    hint: "السورة المستحب قراءتها يوم الجمعة نورا بين الجمعتين!",
  },
  {
    tag: "صيغ التسبيح",
    question: "أي سورة من السور التالية افتتحت بالتسبيح بصيغة الفعل الماضي (سَبَّحَ لِلَّهِ)؟",
    options: [
      { text: "سورة الحديد", icon: "⚙️", isOdd: true, note: "سورة الحديد بدأت بـ (سَبَّحَ لِلَّهِ مَا فِي السَّمَاوَاتِ وَالْأَرْضِ)، بينما الجمعة بـ (يُسَبِّحُ)، والأعلى بـ (سَبِّحْ)." },
      { text: "سورة الجمعة", icon: "🕌", isOdd: false },
      { text: "سورة التغابن", icon: "⚖️", isOdd: false },
      { text: "سورة الأعلى", icon: "⭐", isOdd: false },
    ],
    hint: "سورة عظيمة سميت باسم أصلب المعادن الذي أنزله الله فيه بأس شديد ومنافع للناس!",
  },
  {
    tag: "نساء مكرمات",
    question: "من هي المرأة الوحيدة التي ذكر اسمها صريحاً في القرآن الكريم وسُميت باسمها سورة كاملة؟",
    options: [
      { text: "مريم ابنة عمران", icon: "🌸", isOdd: true, note: "السيدة الصديقة مريم هي المرأة الوحيدة المصرح باسمها في القرآن (ذُكرت 34 مرة) ولها سورة باسمها." },
      { text: "آسية امرأة فرعون", icon: "👑", isOdd: false },
      { text: "خديجة بنت خويلد", icon: "💎", isOdd: false },
      { text: "سارة زوج إبراهيم", icon: "🌿", isOdd: false },
    ],
    hint: "أم نبي الله عيسى عليه السلام، التي اصطفاها الله وطهرها على نساء العالمين!",
  },
  {
    tag: "أمثال القرآن",
    question: "في أي سورة ضرب الله مثلاً بأصغر كائن (البعوضة فما فوقها) لبيان قدرته وحكمته؟",
    options: [
      { text: "سورة البقرة", icon: "🦟", isOdd: true, note: "قال تعالى: (إِنَّ اللَّهَ لَا يَسْتَحْيِي أَن يَضْرِبَ مَثَلًا مَّا بَعُوضَةً فَمَا فَوْقَهَا)." },
      { text: "سورة النحل", icon: "🐝", isOdd: false },
      { text: "سورة العنكبوت", icon: "🕸️", isOdd: false },
      { text: "سورة النمل", icon: "🐜", isOdd: false },
    ],
    hint: "الآية 26 من السورة الكبرى التي تسمى سنام القرآن الكريم!",
  },
  {
    tag: "مأكولات الجنة",
    question: "أي من هذه السور بدأت بالقسم بثمرتين مباركتين في الشام وفلسطين؟",
    options: [
      { text: "سورة التين", icon: "🍈", isOdd: true, note: "تبدأ بـ: (وَالتِّينِ وَالزَّيْتُونِ * وَطُورِ سِينِينَ * وَهَٰذَا الْبَلَدِ الْأَمِينِ)." },
      { text: "سورة الرمان", icon: "🍎", isOdd: false },
      { text: "سورة النخيل", icon: "🌴", isOdd: false },
      { text: "سورة الأعناب", icon: "🍇", isOdd: false },
    ],
    hint: "سورة تذكر خَلق الإنسان في أحسن تقويم!",
  },
];

const QUESTION_TIME_LIMIT = 18; // 18 ثانية لكل سؤال لرفع التحدي والصعوبة

function playSound(type: "correct" | "wrong" | "timeout" | "hint" | "win" | "tick") {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (type === "correct") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.14);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === "wrong" || type === "timeout") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(130, ctx.currentTime + 0.22);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.23);
    } else if (type === "hint") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } else if (type === "tick") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } else if (type === "win") {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.26);
      });
    }
  } catch {
    /* AudioContext fallback */
  }
}

export default function DetectiveGame({ def: _def }: DetectiveGameProps) {
  // خلط الأسئلة عند بدء الجلسة
  const questionsPool = useMemo(() => {
    return [...QUESTIONS].sort(() => 0.5 - Math.random());
  }, []);

  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(getCoins);
  const [streak, setStreak] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [chosenIdx, setChosenIdx] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [eliminatedIdxs, setEliminatedIdxs] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const [isTimedOut, setIsTimedOut] = useState(false);

  // خيارات السؤال الحالي مخلوطة
  const [shuffledOptions, setShuffledOptions] = useState(() => {
    return [...questionsPool[0].options].sort(() => 0.5 - Math.random());
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleCoins = () => setCoins(getCoins());
    window.addEventListener("mushaf:coins", handleCoins);
    return () => window.removeEventListener("mushaf:coins", handleCoins);
  }, []);

  // مؤقت العد التنازلي الحماسي
  useEffect(() => {
    if (answered || isTimedOut) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current as NodeJS.Timeout);
          // انتهى الوقت!
          playSound("timeout");
          setIsTimedOut(true);
          setAnswered(true);
          setStreak(0);
          return 0;
        }
        if (prev <= 6) {
          playSound("tick");
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [answered, isTimedOut, qIndex]);

  const currentQ = questionsPool[qIndex % questionsPool.length];

  // اختيار إجابة
  const handleSelect = (idx: number) => {
    if (answered || isTimedOut || eliminatedIdxs.includes(idx)) return;
    setAnswered(true);
    setChosenIdx(idx);

    const opt = shuffledOptions[idx];
    if (opt.isOdd) {
      // إجابة صحيحة!
      playSound("correct");
      const newStreak = streak + 1;
      setStreak(newStreak);
      // مكافأة سرعة وحسن إجابة
      const speedBonus = timeLeft >= 10 ? 1 : 0;
      const streakBonus = newStreak >= 3 ? 2 : 1;
      const totalWin = streakBonus + speedBonus;
      setScore((s) => s + totalWin);
      addCoins(totalWin);
    } else {
      playSound("wrong");
      setStreak(0);
    }
  };

  // المساعدة بتكلفة 1 نجمة: حذف إجابتين خاطئتين + إظهار التلميح
  const useMueenClue = () => {
    if (answered || isTimedOut || showHint) return;

    if (!spendCoins(1)) {
      toast({
        title: "النجوم غير كافية!",
        description: "تحتاج إلى نجمة واحدة ⭐ للحصول على مساعدة المحقق القرآني. اقرأ واستمع للقرآن لتكسب نجوماً!",
        variant: "destructive",
      });
      return;
    }

    playSound("hint");
    setShowHint(true);

    // استبعاد إجابة خاطئة أو إجابتين
    const wrongIdxs = shuffledOptions
      .map((opt, i) => (!opt.isOdd ? i : -1))
      .filter((i) => i !== -1);
    
    // خلط واختيار ما يصل إلى إجابتين لحذفهما
    const toEliminate = wrongIdxs.sort(() => 0.5 - Math.random()).slice(0, 2);
    setEliminatedIdxs(toEliminate);

    toast({
      title: "مساعدة المحقق الذكي 💡 (-1 ⭐)",
      description: "تم خصم نجمة واحدة وحذف خيارين خاطئين وكشف دليل قرآني محكم!",
    });
  };

  const nextQuestion = () => {
    const nextIdx = (qIndex + 1) % questionsPool.length;
    setQIndex(nextIdx);
    setAnswered(false);
    setIsTimedOut(false);
    setChosenIdx(null);
    setShowHint(false);
    setEliminatedIdxs([]);
    setTimeLeft(QUESTION_TIME_LIMIT);
    setShuffledOptions([...questionsPool[nextIdx].options].sort(() => 0.5 - Math.random()));
  };

  // ألقاب ورتب المحقق القرآني حسب النقاط
  const detectiveRank = useMemo(() => {
    if (score >= 25) return { title: "أُسْطُورَةُ التَّحْقِيقِ الْقُرْآنِيّ", badge: "👑", color: "text-amber-400" };
    if (score >= 15) return { title: "كَبِيرُ الْمُحَقِّقِينَ", badge: "🛡️", color: "text-indigo-400" };
    if (score >= 7) return { title: "مُفَتِّشٌ قُرْآنِيٌّ ذَكِيّ", badge: "🕵️‍♂️", color: "text-teal-400" };
    return { title: "مُحَقِّقٌ قُرْآنِيٌّ وَاعِد", badge: "🔍", color: "text-emerald-400" };
  }, [score]);

  const isFinished = qIndex >= questionsPool.length;

  if (isFinished) {
    return (
      <div className="space-y-4 text-center py-6 animate-fade-up max-w-xl mx-auto" dir="rtl">
        <Trophy className="w-16 h-16 mx-auto text-amber-400 drop-shadow-lg animate-bounce" />
        <h3 className="text-xl sm:text-2xl font-black text-foreground">
          ما شاء الله! أنهيت جولة المحقق القرآني الكبرى 🌟
        </h3>
        <div className="p-4 rounded-3xl bg-secondary/40 border-2 border-border/80 space-y-1.5">
          <p className="text-sm text-muted-foreground font-bold">الرتبة القرآنية التي حققتها:</p>
          <p className="text-xl font-black text-amber-500 flex items-center justify-center gap-1.5">
            <span>{detectiveRank.badge}</span>
            <span>{detectiveRank.title}</span>
          </p>
          <p className="text-xs text-muted-foreground">رصيد النقاط المحققة: {score} نقطة عبقرية</p>
        </div>
        <button
          onClick={() => {
            setQIndex(0);
            setScore(0);
            setStreak(0);
            setAnswered(false);
            setIsTimedOut(false);
            setChosenIdx(null);
            setShowHint(false);
            setEliminatedIdxs([]);
            setTimeLeft(QUESTION_TIME_LIMIT);
            setShuffledOptions([...questionsPool[0].options].sort(() => 0.5 - Math.random()));
          }}
          className="btn-gold mx-auto px-7 py-3 rounded-2xl font-black flex items-center gap-2 text-base shadow-xl hover:brightness-105 active:scale-95 transition-all"
        >
          <RefreshCw className="w-5 h-5" /> ابدأ تحقيقاً جديداً
        </button>
      </div>
    );
  }

  const oddOpt = shuffledOptions.find((o) => o.isOdd);

  return (
    <div className="space-y-4 text-center animate-fade-up max-w-xl mx-auto" dir="rtl">
      {/* شريط الإحصائيات العلوي الملكي الموحد */}
      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-3.5 py-2 bg-secondary/50 backdrop-blur-sm rounded-2xl border border-border/70 shadow-sm">
        <span className="bg-primary/15 text-primary border border-primary/30 px-3 py-1 rounded-full font-black">
          فئة: {currentQ.tag}
        </span>
        <span className="text-amber-500 font-black text-sm flex items-center gap-1 bg-amber-500/15 px-3 py-1 rounded-full border border-amber-500/30 shadow-inner">
          <Star className="w-4 h-4 fill-amber-500" /> {formatCoins(coins)} نجمة
        </span>
        <span className="text-muted-foreground font-extrabold">
          القضية {(qIndex % questionsPool.length) + 1} من {questionsPool.length}
        </span>
      </div>

      {/* شريط المؤقت التنازلي التحدي + رتبة المحقق */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5 text-xs font-black text-muted-foreground">
          <Shield className="w-4 h-4 text-accent" />
          <span className={detectiveRank.color}>{detectiveRank.title}</span>
        </div>

        {/* مؤقت الثواني */}
        <div className="flex items-center gap-1.5">
          <Timer className={`w-4 h-4 ${timeLeft <= 5 ? "text-rose-500 animate-spin" : "text-amber-500"}`} />
          <span
            className={`font-black text-xs sm:text-sm px-2.5 py-0.5 rounded-full border ${
              timeLeft <= 5
                ? "bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse"
                : "bg-amber-500/10 border-amber-500/30 text-amber-500"
            }`}
          >
            {timeLeft} ثانية
          </span>
        </div>
      </div>

      {/* خط مؤقت متحرك وسلس */}
      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden border border-border/40">
        <div
          className={`h-full transition-all duration-1000 ${
            timeLeft <= 5 ? "bg-rose-500" : timeLeft <= 10 ? "bg-amber-500" : "bg-emerald-500"
          }`}
          style={{ width: `${(timeLeft / QUESTION_TIME_LIMIT) * 100}%` }}
        />
      </div>

      {/* شارة السلسلة العبقرية */}
      {streak >= 2 && (
        <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 text-amber-500 border border-amber-500/30 px-3.5 py-1 rounded-full text-xs font-black animate-bounce shadow-sm">
          <Flame className="w-4 h-4 text-orange-500 fill-orange-500" /> سلسلة عبقرية {streak}× متتالية!
        </div>
      )}

      {/* بطاقة السؤال القرآني الفاخرة */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-card via-card/95 to-secondary/30 border-2 border-accent/25 shadow-xl space-y-1.5 text-right">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-black text-accent uppercase tracking-wider">اللغز القرآني المطلوب حله:</p>
          <span className="text-[10px] font-bold text-muted-foreground">اختر الإجابة الصحيحة والدقيقة</span>
        </div>
        <p className="text-base sm:text-lg font-black text-foreground leading-relaxed">
          {currentQ.question}
        </p>
      </div>

      {/* شبكة الخيارات 2×2 المحسنة */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        {shuffledOptions.map((opt, i) => {
          const isEliminated = eliminatedIdxs.includes(i);
          let btnClass = "bg-secondary/80 border-border hover:border-amber-500/50 text-foreground hover:bg-secondary";

          if (isEliminated) {
            btnClass = "bg-secondary/20 border-dashed border-border/30 text-muted-foreground/30 line-through opacity-30 cursor-not-allowed";
          } else if (answered || isTimedOut) {
            if (opt.isOdd) {
              btnClass = "bg-gradient-to-br from-emerald-600/30 to-emerald-800/40 border-emerald-400 text-emerald-300 font-black shadow-lg shadow-emerald-500/20 scale-[1.02]";
            } else if (i === chosenIdx) {
              btnClass = "bg-rose-500/25 border-rose-500 text-rose-300 line-through";
            } else {
              btnClass = "bg-secondary/40 border-border/40 text-muted-foreground opacity-50";
            }
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={answered || isTimedOut || isEliminated}
              className={`p-3.5 sm:p-4 rounded-2xl border-2 flex items-center justify-between gap-3 min-h-[72px] sm:min-h-[82px] transition-all duration-200 active:scale-95 cursor-pointer text-right shadow-sm ${btnClass}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-2xl sm:text-3xl shrink-0">{opt.icon}</span>
                <span className="font-extrabold text-sm sm:text-base leading-snug">{opt.text}</span>
              </div>
              {answered && opt.isOdd && (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 animate-bounce" />
              )}
            </button>
          );
        })}
      </div>

      {/* زر المُعِين القرآني الذكي للمساعدة بنجوم (-1 ⭐) مع حذف خيارات خاطئة */}
      <button
        onClick={useMueenClue}
        disabled={answered || isTimedOut || showHint}
        className="w-full p-3.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/30 active:scale-98 transition-all flex items-center justify-between text-right cursor-pointer shadow-sm disabled:opacity-50"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Lightbulb className="w-4 h-4 animate-pulse" />
          </div>
          <div className="text-xs min-w-0">
            <span className="text-amber-500 font-black block">المُعِين القرآني الذكي:</span>
            <span className="text-muted-foreground font-semibold truncate block">
              {showHint
                ? currentQ.hint
                : "اضغط هنا ليكشف لك المُعِين دليلاً ذكياً ويحذف خيارين خاطئين (تكلفة: 1 نجمة)"}
            </span>
          </div>
        </div>
        <span className="text-[11px] font-black text-amber-500 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30 shrink-0 flex items-center gap-1 shadow-sm">
          <Star className="w-3 h-3 fill-amber-500" />
          <span>{showHint ? "مُفعّل ✓" : "تلميح (-1 ⭐)"}</span>
        </span>
      </button>

      {/* نتيجة الإجابة والتغذية الراجعة التفصيلية والزر التالي */}
      {(answered || isTimedOut) && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-card via-card to-secondary/30 border-2 border-border shadow-xl space-y-3 animate-fade-up text-right">
          <div className="flex items-center justify-center gap-2 font-black text-base">
            {isTimedOut ? (
              <span className="text-amber-400 flex items-center gap-1.5">
                <Timer className="w-5 h-5 text-amber-400" /> انتهى وقت المحاولة السريعة! إليك الحقيقة القرآنية:
              </span>
            ) : chosenIdx !== null && shuffledOptions[chosenIdx].isOdd ? (
              <span className="text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" /> أحسنت يا محقق القرآن العبقري! إجابة دقيقة 🌟
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1.5">
                <XCircle className="w-5 h-5 text-rose-400" /> إجابة تحتاج تركيزاً، تفضل السر القرآني:
              </span>
            )}
          </div>

          {oddOpt?.note && (
            <div className="p-3 rounded-2xl bg-secondary/50 border border-border/80 text-xs sm:text-sm text-foreground leading-relaxed font-semibold">
              <span className="text-accent font-black block mb-0.5">الدليل القرآني المحقق:</span>
              {oddOpt.note}
            </div>
          )}

          <button
            onClick={nextQuestion}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-black text-base shadow-lg hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span>القضية التالية</span>
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

