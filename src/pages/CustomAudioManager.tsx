import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trash2, ArrowUp, ArrowDown, Play, Pause, Upload, Pencil, Check, X, Eye, EyeOff, Music, GripVertical } from "lucide-react";
import { CustomAudio, saveCustomAudio, getAllCustomAudios, deleteCustomAudio } from "@/data/customAudioStore";
import { PlaylistConfigItem, syncPlaylist, savePlaylistConfig } from "@/data/playlistStore";
import { SurahItem, useSurahData } from "@/hooks/useSurahData";
import { toast } from "sonner";

type ManagerItem = PlaylistConfigItem & {
  title: string;
  defaultTitle: string;
  audioBlob?: Blob;
  createdAt?: number;
}

export default function CustomAudioManager() {
  const navigate = useNavigate();
  const { surahs, loading: surahsLoading } = useSurahData();
  const [items, setItems] = useState<ManagerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const loadContent = useCallback(async () => {
    try {
      const customAudios = await getAllCustomAudios();
      const config = await syncPlaylist(surahs, customAudios.map((audio) => ({ id: audio.id })));
      
      const customMap = new Map(customAudios.map(a => [a.id, a]));
      const builtinMap = new Map(surahs.map(s => [s.number, s]));

      const managerItems: ManagerItem[] = config.map(c => {
        let title = "";
        let defaultTitle = "";
        let audioBlob: Blob | undefined = undefined;
        let createdAt: number | undefined = undefined;

        if (c.type === 'custom') {
          const ca = customMap.get(c.originalId as string);
          defaultTitle = ca?.title || "تسجيل مجهول";
          title = c.customName || defaultTitle;
          audioBlob = ca?.blob;
          createdAt = ca?.createdAt;
        } else {
          const s = builtinMap.get(Number(c.originalId));
          defaultTitle = s ? `سورة ${s.name}` : "سورة مجهولة";
          title = c.customName || defaultTitle;
        }

        return {
          ...c,
          title,
          defaultTitle,
          audioBlob,
          createdAt
        };
      });

      setItems(managerItems);
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء تحميل المحتوى");
    } finally {
      setLoading(false);
    }
  }, [surahs]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      toast.error("يرجى اختيار ملف صوتي");
      return;
    }

    setUploading(true);
    try {
      const newAudio: CustomAudio = {
        id: crypto.randomUUID(),
        title: file.name.replace(/\.[^/.]+$/, ""),
        blob: file,
        order: 0, // order is managed by playlistStore now
        createdAt: Date.now()
      };
      
      await saveCustomAudio(newAudio);
      toast.success("تم إضافة الملف بنجاح!");
      await loadContent();
      
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء حفظ الملف");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteCustom = async (id: string, originalId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا التسجيل؟ (هذا سيحذفه نهائياً)")) return;
    
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
    }
    
    try {
      await deleteCustomAudio(originalId);
      toast.success("تم الحذف بنجاح");
      await loadContent(); // syncPlaylist will auto-remove it from config
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  const handleRename = async (id: string) => {
    try {
      const newItems = items.map(it => {
        if (it.id === id) {
          const newName = editTitle.trim();
          return { ...it, customName: newName || undefined, title: newName || it.defaultTitle };
        }
        return it;
      });
      setItems(newItems);
      await savePlaylistConfig(newItems);
      toast.success("تم تغيير الاسم بنجاح");
      setEditingId(null);
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء حفظ الاسم");
    }
  };

  const toggleVisibility = async (id: string) => {
    try {
      const newItems = items.map(it => it.id === id ? { ...it, isHidden: !it.isHidden } : it);
      setItems(newItems);
      await savePlaylistConfig(newItems);
    } catch (err) {
      console.error(err);
      toast.error("خطأ أثناء تغيير حالة الإظهار");
    }
  };

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editOrderIndex, setEditOrderIndex] = useState<number | null>(null);
  const [editOrderValue, setEditOrderValue] = useState<string>("");

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newItems = [...items];
    const itemToMove = newItems[draggedIndex];
    
    newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, itemToMove);
    
    newItems.forEach((item, idx) => {
      item.order = idx + 1;
    });
    
    setItems(newItems);
    setDraggedIndex(null);
    setDragOverIndex(null);
    
    await savePlaylistConfig(newItems);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleOrderChange = async (index: number, newIndexStr: string) => {
    let newIndex = parseInt(newIndexStr, 10) - 1;
    if (isNaN(newIndex)) return;
    
    if (newIndex < 0) newIndex = 0;
    if (newIndex >= items.length) newIndex = items.length - 1;
    
    if (newIndex === index) return;
    
    const newItems = [...items];
    const itemToMove = newItems.splice(index, 1)[0];
    newItems.splice(newIndex, 0, itemToMove);
    
    newItems.forEach((item, idx) => {
      item.order = idx + 1;
    });
    
    setItems(newItems);
    await savePlaylistConfig(newItems);
  };

  const togglePlay = (item: ManagerItem) => {
    // Only custom audios can be played here for now, as built-ins require tauri/server fetching
    if (item.type === 'builtin') {
      toast.info("يرجى الاستماع للسور من الصفحة الرئيسية");
      return;
    }

    if (playingId === item.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (!item.audioBlob) return;
      const url = URL.createObjectURL(item.audioBlob);
      const newAudio = new Audio(url);
      newAudio.onended = () => {
        setPlayingId(null);
        URL.revokeObjectURL(url);
      };
      newAudio.play();
      audioRef.current = newAudio;
      setPlayingId(item.id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-3xl flex items-center justify-between mb-8">
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> العودة
        </Button>
        <h1 className="text-3xl font-bold text-primary">إدارة محتوى التطبيق</h1>
        <Button 
          variant="outline" 
          className="text-amber-600 border-amber-200 hover:bg-amber-50"
          onClick={async () => {
            if (window.confirm("هل أنت متأكد من إعادة ترتيب جميع السور للوضع الافتراضي؟")) {
              const newItems = [...items].sort((a, b) => {
                // ترتيب مخصص: الفاتحة (1) أولاً، ثم ترتيب تصاعدي للبقية (النبأ 78، النازعات 79...)
                const idA = typeof a.originalId === 'number' ? a.originalId : 999;
                const idB = typeof b.originalId === 'number' ? b.originalId : 999;
                if (idA === 1) return -1;
                if (idB === 1) return 1;
                return idA - idB;
              });
              newItems.forEach((item, idx) => item.order = idx);
              setItems(newItems);
              await savePlaylistConfig(newItems);
              toast.success("تم إعادة الترتيب للوضع الافتراضي بنجاح");
            }
          }}
        >
          إعادة الترتيب الافتراضي
        </Button>
      </div>

      <Card className="w-full max-w-3xl mb-8 border-2 border-primary/20 shadow-md">
        <CardHeader>
          <CardTitle>إضافة سورة مخصصة</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {/* إضافة سورة برقمها المخصص */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="manual-surah" className="font-bold">1. إضافة رقم سورة مخصصة (لتظهر مباشرة في الواجهة)</Label>
            <div className="flex gap-4">
              <Input 
                id="manual-surah"
                type="number"
                placeholder="اكتب رقم السورة (مثلاً 50)"
                min="1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = (e.target as HTMLInputElement).value;
                    const num = parseInt(val, 10);
                    if (!isNaN(num) && num > 0) {
                      const current = JSON.parse(localStorage.getItem('MANUAL_SURAHS') || '[]');
                      if (!current.includes(num)) {
                        localStorage.setItem('MANUAL_SURAHS', JSON.stringify([...current, num]));
                        toast.success(`تم إضافة السورة رقم ${num} للواجهة`);
                        window.location.reload();
                      } else {
                        toast.error("هذا الرقم موجود بالفعل!");
                      }
                    }
                  }
                }}
              />
              <Button onClick={() => {
                const input = document.getElementById('manual-surah') as HTMLInputElement;
                const num = parseInt(input.value, 10);
                if (!isNaN(num) && num > 0) {
                  const current = JSON.parse(localStorage.getItem('MANUAL_SURAHS') || '[]');
                  if (!current.includes(num)) {
                    localStorage.setItem('MANUAL_SURAHS', JSON.stringify([...current, num]));
                    toast.success(`تم إضافة السورة رقم ${num} للواجهة`);
                    window.location.reload();
                  } else {
                    toast.error("هذا الرقم موجود بالفعل!");
                  }
                }
              }}>
                إضافة برقمها
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="w-full max-w-3xl flex flex-col gap-3">
        {loading ? (
          <p className="text-center text-muted-foreground">جاري التحميل...</p>
        ) : items.length === 0 ? (
          <p className="text-center text-muted-foreground">لا يوجد محتوى حالياً.</p>
        ) : (
          items.map((item, index) => (
            <Card 
              key={item.id} 
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:border-primary transition-colors gap-4 cursor-grab active:cursor-grabbing ${item.isHidden ? 'opacity-60 bg-slate-100' : ''} ${dragOverIndex === index ? 'border-primary border-dashed border-2 bg-primary/5' : ''} ${draggedIndex === index ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                  <Input 
                    type="number" 
                    min="1" 
                    value={editOrderIndex === index ? editOrderValue : (index + 1)}
                    onFocus={() => {
                      setEditOrderIndex(index);
                      setEditOrderValue(String(index + 1));
                    }}
                    onChange={(e) => setEditOrderValue(e.target.value)}
                    onBlur={() => {
                      if (editOrderIndex === index) {
                        handleOrderChange(index, editOrderValue);
                        setEditOrderIndex(null);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleOrderChange(index, editOrderValue);
                        setEditOrderIndex(null);
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className="w-14 h-7 text-center text-xs p-1 font-bold bg-transparent border-transparent hover:border-input focus:border-input transition-colors m-0 [&::-webkit-inner-spin-button]:appearance-none"
                    title="اكتب الرقم لتغيير الترتيب ثم اضغط Enter"
                  />
                </div>
                <Button 
                  size="icon" 
                  variant={playingId === item.id ? "default" : "secondary"}
                  className={`rounded-full shrink-0 ${item.type === 'builtin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => togglePlay(item)}
                  title={item.type === 'builtin' ? "التشغيل متاح من القائمة الرئيسية" : "تشغيل"}
                >
                  {playingId === item.id ? <Pause className="h-5 w-5" /> : (item.type === 'custom' ? <Play className="h-5 w-5" /> : <Music className="h-5 w-5" />)}
                </Button>
                <div className="flex-1 w-full flex items-center gap-2">
                  {editingId === item.id ? (
                    <div className="flex items-center gap-2 w-full max-w-[300px]">
                      <Input 
                        value={editTitle} 
                        onChange={e => setEditTitle(e.target.value)} 
                        autoFocus
                        onKeyDown={e => e.key === "Enter" && handleRename(item.id)}
                      />
                      <Button size="icon" variant="default" onClick={() => handleRename(item.id)}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="outline" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg leading-tight">{item.title}</h3>
                          {item.type === 'custom' && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">تسجيل خاص</span>}
                          {item.isHidden && <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">مخفي</span>}
                        </div>
                        {item.type === 'custom' && item.createdAt && (
                          <span className="text-xs text-muted-foreground mt-1">
                            {new Date(item.createdAt).toLocaleDateString("ar-SA")}
                          </span>
                        )}
                      </div>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-muted-foreground hover:text-foreground mr-auto shrink-0"
                        onClick={() => { setEditingId(item.id); setEditTitle(item.title); }}
                        title="تعديل الاسم"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 shrink-0">
                <Button 
                  size="icon" 
                  variant="outline" 
                  className={item.isHidden ? "text-slate-500" : "text-sky-600"}
                  onClick={() => toggleVisibility(item.id)}
                  title={item.isHidden ? "إظهار" : "إخفاء"}
                >
                  {item.isHidden ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
                {item.type === 'custom' && (
                  <Button size="icon" variant="destructive" onClick={() => handleDeleteCustom(item.id, item.originalId as string)} title="حذف نهائي">
                    <Trash2 className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
