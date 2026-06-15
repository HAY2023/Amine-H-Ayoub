import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Plus, RotateCcw, Save, Trash2, ZoomIn, ZoomOut, Copy, Link2, ListOrdered, ChevronUp, ChevronDown, ChevronRight, ChevronLeft, X, Check, Square, Upload } from "lucide-react";
import { AyahBox, getAllPageSources, getPageAyahBoxes, PAGE_IMAGE_SIZE, resetPageAyahBoxes, savePageAyahBoxes } from "@/data/ayahCoordinates";
import { getPageSurahRegions, savePageSurahRegions, SurahRegion } from "@/data/surahRegions";
import { CustomPage, getCustomPages, addCustomPage, removeCustomPage, savePageImage, getAllPageImages, deletePageImage } from "@/data/customPages";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const step = 10;

const AyahCalibration = () => {
  const [customPages, setCustomPages] = useState<CustomPage[]>(() => getCustomPages());
  const [customImages, setCustomImages] = useState<Record<string, string>>({});
  const pageSources = useMemo(() => [...getAllPageSources(), ...customPages.map(p => p.src)], [customPages]);

  const [pageSrc, setPageSrc] = useState(pageSources[0]);
  const [boxes, setBoxes] = useState<AyahBox[]>(() => getPageAyahBoxes(pageSources[0]));
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scale, setScale] = useState(() => typeof window === "undefined" ? 1 : clamp((window.innerWidth - 24) / PAGE_IMAGE_SIZE.width, 0.25, 1));
  const [isSaving, setIsSaving] = useState(false);

  // مناطق السور (تعريف فقط، اسم + رقم لكل سورة)
  const [regions, setRegions] = useState<SurahRegion[]>(() => getPageSurahRegions(pageSources[0]));
  const [selectedRegion, setSelectedRegion] = useState(0);
  const [showRegions, setShowRegions] = useState(true);

  // إضافة صفحة جديدة برفع صورة
  const [newSurahOpen, setNewSurahOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  // ترتيب الصفحات (يُحفظ بمعرّف المسار src ويقرؤه القارئ)
  const PAGE_ORDER_KEY = "mushaf:pageOrder:v1";
  const [arrangeOpen, setArrangeOpen] = useState(false);
  const [draftSrcOrder, setDraftSrcOrder] = useState<string[]>([]);

  const [history, setHistory] = useState<AyahBox[][]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const selected = boxes[selectedIndex];

  // ─────────── تحميل ومساعدات ───────────
  useEffect(() => { getAllPageImages().then(setCustomImages).catch(() => {}); }, []);

  const imgSrcFor = (src: string) => customImages[src] || src;
  const pageLabel = (src: string) => {
    const cp = customPages.find(p => p.src === src);
    return cp ? `🟢 ${cp.name}` : src.replace("/pages/", "");
  };

  const saveHistory = useCallback((current: AyahBox[]) => {
    setHistory(prev => { const next = [...prev, current]; if (next.length > 20) next.shift(); return next; });
  }, []);

  const undo = () => {
    if (history.length === 0) { toast({ title: "⚠️ لا يوجد تراجع" }); return; }
    const previous = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setBoxes(previous);
    setSelectedIndex(i => Math.min(i, Math.max(0, previous.length - 1)));
  };

  const loadPage = (src: string) => {
    setPageSrc(src);
    setBoxes(getPageAyahBoxes(src));
    setRegions(getPageSurahRegions(src));
    setSelectedRegion(0);
    setSelectedIndex(0);
    setHistory([]);
  };

  // ─────────── تحرير مربعات الآيات ───────────
  const updateSelected = (patch: Partial<AyahBox>) =>
    setBoxes(current => current.map((b, i) => i === selectedIndex ? { ...b, ...patch } : b));

  const move = (dx: number, dy: number) => {
    if (!selected) return;
    updateSelected({
      x: clamp(selected.x + dx, 0, PAGE_IMAGE_SIZE.width - selected.width),
      y: clamp(selected.y + dy, 0, PAGE_IMAGE_SIZE.height - selected.height),
    });
  };

  const resize = (dw: number, dh: number) => {
    if (!selected) return;
    updateSelected({
      width: clamp(selected.width + dw, 30, PAGE_IMAGE_SIZE.width - selected.x),
      height: clamp(selected.height + dh, 25, PAGE_IMAGE_SIZE.height - selected.y),
    });
  };

  const addNewBox = () => {
    saveHistory(boxes);
    const ref = selected || boxes[boxes.length - 1];
    const box: AyahBox = {
      surah: ref?.surah ?? 1,
      ayah: (ref?.ayah ?? 0) + 1,
      x: ref?.x ?? 140,
      y: ref ? clamp(ref.y + ref.height + 10, 0, PAGE_IMAGE_SIZE.height - 100) : 300,
      width: ref?.width ?? 980,
      height: ref?.height ?? 100,
    };
    setBoxes(current => {
      if (selected) { const next = [...current.slice(0, selectedIndex + 1), box, ...current.slice(selectedIndex + 1)]; setSelectedIndex(selectedIndex + 1); return next; }
      setSelectedIndex(current.length); return [...current, box];
    });
  };

  const duplicateSelected = () => {
    if (!selected) return;
    saveHistory(boxes);
    const copy: AyahBox = { ...selected, ayah: selected.ayah + 1, y: clamp(selected.y + selected.height + 8, 0, PAGE_IMAGE_SIZE.height - selected.height) };
    setBoxes(current => { const next = [...current.slice(0, selectedIndex + 1), copy, ...current.slice(selectedIndex + 1)]; setSelectedIndex(selectedIndex + 1); return next; });
  };

  // جزء ثانٍ بنفس رقم الآية (لآية ممتدّة على سطرين) — يُظلَّل الجزآن كآية واحدة في القارئ
  const addLinkedPart = () => {
    if (!selected) return;
    saveHistory(boxes);
    const part: AyahBox = { ...selected, y: clamp(selected.y + selected.height + 8, 0, PAGE_IMAGE_SIZE.height - selected.height) };
    setBoxes(current => { const next = [...current.slice(0, selectedIndex + 1), part, ...current.slice(selectedIndex + 1)]; setSelectedIndex(selectedIndex + 1); return next; });
    toast({ title: "✅ جزء مرتبط", description: "نفس الآية — حرّكه للسطر الثاني." });
  };

  const deleteSelected = () => {
    if (boxes.length === 0) return;
    saveHistory(boxes);
    setBoxes(current => current.filter((_, i) => i !== selectedIndex));
    setSelectedIndex(i => Math.max(0, i - 1));
  };

  const applyHeightToAll = () => {
    if (!selected) return;
    saveHistory(boxes);
    setBoxes(current => current.map(b => ({ ...b, height: selected.height })));
    toast({ title: "✅ توحيد الارتفاع" });
  };

  const applyWidthAndXToAll = () => {
    if (!selected) return;
    saveHistory(boxes);
    setBoxes(current => current.map(b => ({ ...b, x: selected.x, width: selected.width })));
    toast({ title: "✅ محاذاة العرض والمكان" });
  };

  // تعديل رقم السورة يغيّر رقم كل مربعات نفس السورة على الصفحة
  const setSurahForGroup = (newSurah: number) => {
    if (!selected) return;
    const old = selected.surah;
    setBoxes(cur => cur.map(b => b.surah === old ? { ...b, surah: newSurah } : b));
  };

  const dragStart = (index: number, e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelectedIndex(index);
    saveHistory(boxes);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const startX = e.clientX, startY = e.clientY, startBox = boxes[index];
    const onMove = (ev: PointerEvent) => {
      const rx = PAGE_IMAGE_SIZE.width / rect.width, ry = PAGE_IMAGE_SIZE.height / rect.height;
      setBoxes(cur => cur.map((b, i) => i === index ? {
        ...b,
        x: clamp(startBox.x + (ev.clientX - startX) * rx, 0, PAGE_IMAGE_SIZE.width - startBox.width),
        y: clamp(startBox.y + (ev.clientY - startY) * ry, 0, PAGE_IMAGE_SIZE.height - startBox.height),
      } : b));
    };
    const onUp = () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  // ─────────── مناطق السور ───────────
  const updateRegion = (patch: Partial<SurahRegion>) =>
    setRegions(cur => cur.map((r, i) => i === selectedRegion ? { ...r, ...patch } : r));

  const addRegion = () => {
    const r: SurahRegion = { name: "", x: 180, y: 220, width: 900, height: 320 };
    setRegions(cur => { const next = [...cur, r]; setSelectedRegion(next.length - 1); return next; });
    setShowRegions(true);
  };

  const deleteRegion = (i: number) => {
    setRegions(cur => cur.filter((_, idx) => idx !== i));
    setSelectedRegion(s => Math.max(0, s - (i <= s ? 1 : 0)));
  };

  const regionMove = (dx: number, dy: number) => {
    const r = regions[selectedRegion]; if (!r) return;
    updateRegion({ x: clamp(r.x + dx, 0, PAGE_IMAGE_SIZE.width - r.width), y: clamp(r.y + dy, 0, PAGE_IMAGE_SIZE.height - r.height) });
  };

  const regionResize = (dw: number, dh: number) => {
    const r = regions[selectedRegion]; if (!r) return;
    updateRegion({ width: clamp(r.width + dw, 40, PAGE_IMAGE_SIZE.width - r.x), height: clamp(r.height + dh, 30, PAGE_IMAGE_SIZE.height - r.y) });
  };

  const regionDragStart = (index: number, e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelectedRegion(index);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const startX = e.clientX, startY = e.clientY, startR = regions[index];
    const onMove = (ev: PointerEvent) => {
      const rx = PAGE_IMAGE_SIZE.width / rect.width, ry = PAGE_IMAGE_SIZE.height / rect.height;
      setRegions(cur => cur.map((r, i) => i === index ? {
        ...r,
        x: clamp(startR.x + (ev.clientX - startX) * rx, 0, PAGE_IMAGE_SIZE.width - startR.width),
        y: clamp(startR.y + (ev.clientY - startY) * ry, 0, PAGE_IMAGE_SIZE.height - startR.height),
      } : r));
    };
    const onUp = () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  // ─────────── رفع صفحة جديدة ───────────
  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const createPage = async () => {
    if (!newFile) { toast({ title: "⚠️ اختر صورة الصفحة أولاً", variant: "destructive" }); return; }
    if (!newName.trim()) { toast({ title: "⚠️ اكتب اسم/رقم الصفحة", variant: "destructive" }); return; }
    setCreating(true);
    try {
      const dataUrl = await readFileAsDataUrl(newFile);
      const uniqueSrc = `custom:${Date.now()}`;
      await savePageImage(uniqueSrc, dataUrl);
      setCustomPages(addCustomPage({ src: uniqueSrc, name: newName.trim() }));
      setCustomImages(prev => ({ ...prev, [uniqueSrc]: dataUrl }));
      setPageSrc(uniqueSrc); setBoxes([]); setRegions(getPageSurahRegions(uniqueSrc));
      setSelectedIndex(0); setSelectedRegion(0); setHistory([]); setShowRegions(true);
      setNewSurahOpen(false); setNewName(""); setNewFile(null);
      toast({ title: "✅ أُضيفت الصفحة", description: `${newName.trim()} — أضف منطقة لكل سورة (اسم + رقم).` });
    } catch (e) {
      toast({ title: "❌ فشل رفع الصورة", description: e instanceof Error ? e.message : "خطأ", variant: "destructive" });
    } finally { setCreating(false); }
  };

  const deleteCustomPage = async (src: string) => {
    setCustomPages(removeCustomPage(src));
    await deletePageImage(src).catch(() => {});
    setCustomImages(prev => { const n = { ...prev }; delete n[src]; return n; });
    await resetPageAyahBoxes(src);
    loadPage(getAllPageSources()[0]);
    toast({ title: "🗑️ حُذفت الصفحة المرفوعة" });
  };

  // ─────────── ترتيب الصفحات ───────────
  const openArrange = useCallback(() => {
    let saved: string[] = [];
    try { const raw = localStorage.getItem(PAGE_ORDER_KEY); saved = raw ? JSON.parse(raw) : []; } catch { saved = []; }
    const valid = (Array.isArray(saved) ? saved : []).filter(s => pageSources.includes(s));
    pageSources.forEach(s => { if (!valid.includes(s)) valid.push(s); });
    setDraftSrcOrder(valid);
    setArrangeOpen(true);
  }, [pageSources]);

  const moveInOrder = (pos: number, dir: -1 | 1) => {
    setDraftSrcOrder(cur => {
      const next = [...cur]; const t = pos + dir;
      if (t < 0 || t >= next.length) return cur;
      [next[pos], next[t]] = [next[t], next[pos]];
      return next;
    });
  };

  // ─────────── الحفظ ───────────
  const saveAll = useCallback((silent = false) => {
    savePageAyahBoxes(pageSrc, boxes);
    savePageSurahRegions(pageSrc, regions);
    if (!silent) {
      setIsSaving(true);
      toast({ title: "✅ تم الحفظ", description: `${boxes.length} مربع · ${regions.length} منطقة سورة` });
      setTimeout(() => setIsSaving(false), 1200);
    }
  }, [boxes, regions, pageSrc]);

  // حفظ تلقائي عند الخروج
  const stateRef = useRef({ pageSrc, boxes, regions });
  useEffect(() => { stateRef.current = { pageSrc, boxes, regions }; }, [pageSrc, boxes, regions]);
  useEffect(() => () => {
    const s = stateRef.current;
    savePageAyahBoxes(s.pageSrc, s.boxes);
    savePageSurahRegions(s.pageSrc, s.regions);
  }, []);

  const isCustom = customPages.some(p => p.src === pageSrc);

  // ─────────── الواجهة ───────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white" dir="rtl">
      <div className="mx-auto max-w-6xl px-3 py-3 space-y-3">
        {/* الرأس */}
        <header className="flex items-center justify-between gap-2 rounded-2xl bg-slate-800/70 backdrop-blur border border-slate-700 px-3 py-2 sticky top-2 z-20">
          <Link to="/" className="flex h-10 items-center gap-1 rounded-full bg-slate-700 px-4 text-sm font-bold hover:bg-slate-600 active:scale-95 transition-all">
            <ArrowRight className="h-4 w-4" /> رجوع
          </Link>
          <h1 className="font-extrabold text-base sm:text-lg text-amber-300">📐 معايرة المصحف</h1>
          <div className="flex items-center gap-2">
            <button onClick={undo} disabled={history.length === 0}
              className={`flex h-10 items-center gap-1 rounded-full px-3 text-sm font-bold active:scale-95 transition-all ${history.length === 0 ? "bg-slate-700/50 text-slate-500" : "bg-slate-700 hover:bg-slate-600 text-white"}`}>
              <RotateCcw className="h-4 w-4" />
            </button>
            <button onClick={() => saveAll(false)}
              className={`flex h-10 items-center gap-1 rounded-full px-5 text-sm font-extrabold active:scale-95 transition-all ${isSaving ? "bg-emerald-600 text-white" : "bg-gradient-to-r from-amber-500 to-amber-600 text-black"}`}>
              <Save className="h-4 w-4" /> {isSaving ? "✅" : "حفظ"}
            </button>
          </div>
        </header>

        <section className="grid gap-3 lg:grid-cols-[1fr_330px]">
          {/* اللوحة */}
          <div className="max-h-[82vh] overflow-auto rounded-2xl bg-slate-800/60 backdrop-blur border border-slate-700 p-2 touch-none">
            <div ref={canvasRef} className="relative mx-auto origin-top" style={{ width: PAGE_IMAGE_SIZE.width * scale, height: PAGE_IMAGE_SIZE.height * scale }}>
              <img src={imgSrcFor(pageSrc)} alt="صفحة المصحف" className="absolute inset-0 h-full w-full select-none object-fill" draggable={false} />
              {/* مربعات الآيات */}
              {boxes.map((box, index) => {
                const isSel = index === selectedIndex;
                return (
                  <button
                    key={`${box.surah}-${box.ayah}-${index}`}
                    onPointerDown={(e) => dragStart(index, e)}
                    className="absolute rounded-md border-2 transition-all touch-none"
                    style={{
                      left: box.x * scale, top: box.y * scale, width: box.width * scale, height: box.height * scale,
                      mixBlendMode: "multiply",
                      background: isSel ? "rgba(250,204,21,0.45)" : "rgba(148,163,184,0.18)",
                      borderColor: isSel ? "rgba(250,204,21,0.9)" : "rgba(148,163,184,0.5)",
                      borderStyle: isSel ? "solid" : "dashed",
                    }}
                  >
                    <span className="absolute right-1 top-1 rounded-full bg-black/70 px-1.5 text-[10px] font-bold text-white">
                      {box.surah}:{box.label || box.ayah}
                    </span>
                  </button>
                );
              })}
              {/* مناطق السور */}
              {showRegions && regions.map((r, index) => {
                const isSel = index === selectedRegion;
                return (
                  <div key={`region-${index}`} onPointerDown={(e) => regionDragStart(index, e)}
                    className="absolute rounded-lg border-2 touch-none cursor-move"
                    style={{
                      left: r.x * scale, top: r.y * scale, width: r.width * scale, height: r.height * scale,
                      background: isSel ? "rgba(34,197,94,0.28)" : "rgba(34,197,94,0.12)",
                      borderColor: isSel ? "rgba(34,197,94,0.95)" : "rgba(34,197,94,0.6)", borderStyle: "dashed",
                    }}>
                    <span className="absolute right-1 top-1 rounded-full bg-emerald-900/85 px-2 py-0.5 text-[11px] font-bold text-emerald-100">
                      🟩 {r.name || "سورة"}{r.surah ? ` (${r.surah})` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* الشريط الجانبي */}
          <aside className="space-y-3 max-h-[82vh] overflow-y-auto pb-2">
            {/* ① الصفحة + الرفع + الترتيب */}
            <div className="rounded-2xl bg-slate-800/80 border border-slate-700 p-3 space-y-2">
              <label className="block text-xs font-bold text-slate-400">① الصفحة</label>
              <select value={pageSrc} onChange={(e) => loadPage(e.target.value)} className="w-full rounded-lg bg-slate-700 border-slate-600 p-2 text-sm text-white">
                {pageSources.map(src => <option key={src} value={src}>{pageLabel(src)}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setNewSurahOpen(v => !v)} className="p-2 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1 active:scale-95">
                  <Upload className="h-3.5 w-3.5" /> صفحة جديدة
                </button>
                <button onClick={openArrange} className="p-2 rounded-lg bg-violet-600/20 border border-violet-500/40 text-violet-300 font-bold text-xs flex items-center justify-center gap-1 active:scale-95">
                  <ListOrdered className="h-3.5 w-3.5" /> ترتيب
                </button>
              </div>
              {isCustom && (
                <button onClick={() => deleteCustomPage(pageSrc)} className="w-full p-2 rounded-lg bg-red-600/20 border border-red-500/40 text-red-300 font-bold text-xs flex items-center justify-center gap-1 active:scale-95">
                  <Trash2 className="h-3.5 w-3.5" /> حذف هذه الصفحة المرفوعة
                </button>
              )}
              {newSurahOpen && (
                <div className="rounded-lg bg-slate-900/60 border border-emerald-500/30 p-2 space-y-2">
                  <p className="text-[10px] text-slate-400 leading-relaxed">ارفع صورة الصفحة واكتب اسمها/رقمها. الصفحة قد تحوي أكثر من سورة — عرّف كل سورة بأداة «مناطق السور».</p>
                  <input type="file" accept="image/*" onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                    className="w-full text-[11px] text-slate-300 file:mr-2 file:rounded-md file:border-0 file:bg-emerald-600 file:text-white file:px-2 file:py-1 file:text-xs" />
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="اسم/رقم الصفحة (مثل: 587)"
                    className="w-full rounded-md bg-slate-700 border-slate-600 p-1.5 text-sm text-white outline-none focus:border-emerald-500" />
                  <button onClick={createPage} disabled={creating}
                    className="w-full p-2 rounded-md bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50">
                    <Plus className="h-3.5 w-3.5" /> {creating ? "جارٍ الإنشاء..." : "إنشاء الصفحة"}
                  </button>
                </div>
              )}
              {/* التكبير */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-slate-400">التكبير</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setScale(s => clamp(s - 0.1, 0.25, 2))} className="p-1.5 rounded-md bg-slate-700 text-white active:scale-95"><ZoomOut className="h-4 w-4" /></button>
                  <span className="text-xs text-slate-300 w-10 text-center">{Math.round(scale * 100)}%</span>
                  <button onClick={() => setScale(s => clamp(s + 0.1, 0.25, 2))} className="p-1.5 rounded-md bg-slate-700 text-white active:scale-95"><ZoomIn className="h-4 w-4" /></button>
                </div>
              </div>
            </div>

            {/* ② مناطق السور */}
            <div className="rounded-2xl bg-emerald-950/30 border border-emerald-500/30 p-3 space-y-2">
              <button onClick={() => setShowRegions(v => !v)} className="w-full flex items-center justify-between text-emerald-300 font-bold text-sm">
                <span className="flex items-center gap-1.5"><Square className="h-4 w-4" /> ② مناطق السور ({regions.length})</span>
                <span className="text-xs">{showRegions ? "▲" : "▼"}</span>
              </button>
              {showRegions && (
                <div className="space-y-2">
                  <button onClick={addRegion} className="w-full p-2 rounded-lg bg-emerald-600/30 border border-emerald-500/50 text-emerald-200 font-bold text-xs flex items-center justify-center gap-1 active:scale-95">
                    <Plus className="h-3.5 w-3.5" /> أضف سورة (منطقة)
                  </button>
                  {regions.length === 0 && <p className="text-[11px] text-slate-500 text-center leading-relaxed">اضغط «أضف سورة»، اكتب الاسم والرقم، وحرّك المستطيل الأخضر فوق السورة.</p>}
                  {regions.map((r, i) => (
                    <div key={i} className={`rounded-lg p-2 border ${i === selectedRegion ? "border-emerald-400 bg-emerald-900/30" : "border-slate-700 bg-slate-800/60"}`}>
                      <div className="flex items-center gap-1">
                        <input value={r.name} onChange={(e) => { setSelectedRegion(i); updateRegion({ name: e.target.value }); }} onFocus={() => setSelectedRegion(i)}
                          placeholder="اسم السورة" className="flex-1 min-w-0 rounded-md bg-slate-700 border-slate-600 p-1.5 text-sm text-white outline-none focus:border-emerald-500" />
                        <input type="number" min={1} max={114} value={r.surah ?? ""} onChange={(e) => { setSelectedRegion(i); updateRegion({ surah: parseInt(e.target.value, 10) || undefined }); }} onFocus={() => setSelectedRegion(i)}
                          placeholder="رقم" className="w-14 shrink-0 rounded-md bg-slate-700 border-slate-600 p-1.5 text-sm text-white outline-none focus:border-emerald-500" />
                        <button onClick={() => deleteRegion(i)} className="p-1.5 rounded-md bg-red-600/30 text-red-300 active:scale-95 shrink-0" title="حذف"><Trash2 className="h-4 w-4" /></button>
                      </div>
                      {i === selectedRegion && (
                        <div className="mt-2 grid grid-cols-4 gap-1 text-sm">
                          <button onClick={() => regionMove(-step, 0)} className="p-1.5 rounded bg-slate-700 text-white active:scale-95">←</button>
                          <button onClick={() => regionMove(step, 0)} className="p-1.5 rounded bg-slate-700 text-white active:scale-95">→</button>
                          <button onClick={() => regionMove(0, -step)} className="p-1.5 rounded bg-slate-700 text-white active:scale-95">↑</button>
                          <button onClick={() => regionMove(0, step)} className="p-1.5 rounded bg-slate-700 text-white active:scale-95">↓</button>
                          <button onClick={() => regionResize(-step, 0)} className="p-1.5 rounded bg-slate-600 text-white active:scale-95">◀▶−</button>
                          <button onClick={() => regionResize(step, 0)} className="p-1.5 rounded bg-slate-600 text-white active:scale-95">◀▶+</button>
                          <button onClick={() => regionResize(0, -step)} className="p-1.5 rounded bg-slate-600 text-white active:scale-95">▲▼−</button>
                          <button onClick={() => regionResize(0, step)} className="p-1.5 rounded bg-slate-600 text-white active:scale-95">▲▼+</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ③ مربعات الآيات */}
            <div className="rounded-2xl bg-slate-800/80 border border-slate-700 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-400">③ مربعات الآيات ({boxes.length})</label>
                <button onClick={addNewBox} className="p-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 active:scale-95" title="أضف مربع آية"><Plus className="h-4 w-4" /></button>
              </div>
              {boxes.length === 0 && <p className="text-[11px] text-slate-500 text-center leading-relaxed">لا مربعات. اضغط ＋ لإضافة مربع آية، أو اكتفِ بمناطق السور أعلاه.</p>}
              {selected && (
                <>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setSelectedIndex(i => Math.max(0, i - 1))} className="p-2 rounded-lg bg-slate-700 text-white active:scale-95"><ChevronRight className="h-4 w-4" /></button>
                    <select value={selectedIndex} onChange={(e) => setSelectedIndex(Number(e.target.value))} className="flex-1 rounded-lg bg-slate-700 border-slate-600 p-2 text-sm text-white">
                      {boxes.map((b, i) => <option key={i} value={i}>{b.label || `${b.surah}:${b.ayah}`}</option>)}
                    </select>
                    <button onClick={() => setSelectedIndex(i => Math.min(boxes.length - 1, i + 1))} className="p-2 rounded-lg bg-slate-700 text-white active:scale-95"><ChevronLeft className="h-4 w-4" /></button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="text-[10px] text-slate-500">رقم السورة (يغيّر كل آياتها)</span>
                      <input type="number" min={1} max={114} value={selected.surah} onChange={(e) => setSurahForGroup(parseInt(e.target.value) || 1)}
                        className="w-full rounded-lg bg-slate-700 border-slate-600 p-1.5 text-sm text-white" />
                    </label>
                    <label className="block">
                      <span className="text-[10px] text-slate-500">رقم الآية</span>
                      <input type="number" min={0} value={selected.ayah} onChange={(e) => { const v = parseInt(e.target.value, 10); updateSelected({ ayah: isNaN(v) ? 0 : v }); }}
                        className="w-full rounded-lg bg-slate-700 border-slate-600 p-1.5 text-sm text-white" />
                    </label>
                    <label className="block col-span-2">
                      <span className="text-[10px] text-slate-500">اسم مخصص (اختياري — مثل: البسملة)</span>
                      <input value={selected.label || ""} onChange={(e) => updateSelected({ label: e.target.value || undefined })}
                        className="w-full rounded-lg bg-slate-700 border-slate-600 p-1.5 text-sm text-white" />
                    </label>
                  </div>

                  {/* تحريك وتحجيم */}
                  <div className="grid grid-cols-4 gap-1 text-sm">
                    <button onClick={() => move(-step, 0)} className="p-1.5 rounded bg-slate-700 text-white active:scale-95">←</button>
                    <button onClick={() => move(step, 0)} className="p-1.5 rounded bg-slate-700 text-white active:scale-95">→</button>
                    <button onClick={() => move(0, -step)} className="p-1.5 rounded bg-slate-700 text-white active:scale-95">↑</button>
                    <button onClick={() => move(0, step)} className="p-1.5 rounded bg-slate-700 text-white active:scale-95">↓</button>
                    <button onClick={() => resize(-step, 0)} className="p-1.5 rounded bg-slate-600 text-white active:scale-95">◀▶−</button>
                    <button onClick={() => resize(step, 0)} className="p-1.5 rounded bg-slate-600 text-white active:scale-95">◀▶+</button>
                    <button onClick={() => resize(0, -step)} className="p-1.5 rounded bg-slate-600 text-white active:scale-95">▲▼−</button>
                    <button onClick={() => resize(0, step)} className="p-1.5 rounded bg-slate-600 text-white active:scale-95">▲▼+</button>
                  </div>

                  <div className="grid grid-cols-3 gap-1">
                    <button onClick={duplicateSelected} className="p-2 rounded-lg bg-slate-700 text-white text-xs font-bold active:scale-95 flex items-center justify-center gap-1"><Copy className="h-3.5 w-3.5" /> نسخ</button>
                    <button onClick={addLinkedPart} className="p-2 rounded-lg bg-sky-600/30 border border-sky-500/40 text-sky-200 text-xs font-bold active:scale-95 flex items-center justify-center gap-1" title="جزء بنفس الآية (سطر ثانٍ)"><Link2 className="h-3.5 w-3.5" /> سطرين</button>
                    <button onClick={deleteSelected} className="p-2 rounded-lg bg-red-600/30 border border-red-500/40 text-red-300 text-xs font-bold active:scale-95 flex items-center justify-center gap-1"><Trash2 className="h-3.5 w-3.5" /> حذف</button>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <button onClick={applyHeightToAll} className="p-2 rounded-lg bg-slate-700/70 text-slate-200 text-[11px] font-bold active:scale-95">توحيد الارتفاع</button>
                    <button onClick={applyWidthAndXToAll} className="p-2 rounded-lg bg-slate-700/70 text-slate-200 text-[11px] font-bold active:scale-95">محاذاة العرض</button>
                  </div>
                </>
              )}
            </div>

            <button onClick={() => saveAll(false)} className="w-full p-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold flex items-center justify-center gap-2 active:scale-[0.98]">
              <Save className="h-5 w-5" /> حفظ الصفحة (مربعات + مناطق)
            </button>
          </aside>
        </section>
      </div>

      {/* نافذة ترتيب الصفحات */}
      {arrangeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setArrangeOpen(false)}>
          <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-slate-800 border border-slate-600 p-4 space-y-2" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-amber-300">ترتيب الصفحات في القارئ</h3>
              <button onClick={() => setArrangeOpen(false)} className="p-1.5 rounded-lg bg-slate-700 text-white"><X className="h-4 w-4" /></button>
            </div>
            {draftSrcOrder.map((src, pos) => (
              <div key={src} className="flex items-center gap-2 rounded-lg bg-slate-700/60 p-2 border border-slate-600/50">
                <span className="text-xs text-slate-400 w-5">{pos + 1}</span>
                <img src={imgSrcFor(src)} alt={src} className="w-10 h-14 object-cover rounded-md border border-slate-600 shrink-0" loading="lazy" />
                <span className="flex-1 min-w-0 font-bold text-sm text-slate-200 truncate">{pageLabel(src)}</span>
                <button onClick={() => moveInOrder(pos, -1)} disabled={pos === 0} className="p-1.5 rounded-md bg-slate-600 text-white disabled:opacity-30 active:scale-95"><ChevronUp className="h-4 w-4" /></button>
                <button onClick={() => moveInOrder(pos, 1)} disabled={pos === draftSrcOrder.length - 1} className="p-1.5 rounded-md bg-slate-600 text-white disabled:opacity-30 active:scale-95"><ChevronDown className="h-4 w-4" /></button>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button onClick={() => { localStorage.removeItem(PAGE_ORDER_KEY); setArrangeOpen(false); toast({ title: "↩️ أُعيد الترتيب الأصلي" }); }}
                className="p-2 rounded-lg bg-slate-700 text-white font-bold text-sm active:scale-95">إعادة الأصل</button>
              <button onClick={() => { localStorage.setItem(PAGE_ORDER_KEY, JSON.stringify(draftSrcOrder)); setArrangeOpen(false); toast({ title: "✅ تم حفظ الترتيب", description: "افتح القارئ لرؤيته" }); }}
                className="p-2 rounded-lg bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-1 active:scale-95"><Check className="h-4 w-4" /> حفظ الترتيب</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AyahCalibration;
