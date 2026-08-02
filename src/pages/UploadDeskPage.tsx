import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Upload, Trash2, FileText, Image, Play, Video, File, CheckCircle2 } from "lucide-react";

const STORAGE_KEY = "upload-desk:items:v1";

interface UploadedItem {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: number;
}

type PreviewKind = "image" | "audio" | "video" | "text" | "file";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function loadItems(): UploadedItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveItems(items: UploadedItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function getPreviewKind(type: string): PreviewKind {
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("audio/")) return "audio";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("text/")) return "text";
  return "file";
}

export default function UploadDeskPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<UploadedItem[]>(loadItems);
  const [message, setMessage] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});
  const [textPreviews, setTextPreviews] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveItems(items);
  }, [items]);

  useEffect(() => {
    return () => {
      Object.values(fileUrls).forEach(url => URL.revokeObjectURL(url));
    };
  }, [fileUrls]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const item: UploadedItem = {
      id,
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      uploadedAt: Date.now(),
    };

    setItems(prev => [item, ...prev]);
    setMessage(`تم إضافة الملف: ${file.name}`);

    const url = URL.createObjectURL(file);
    setFileUrls(prev => ({ ...prev, [id]: url }));

    if (getPreviewKind(item.type) === "text") {
      try {
        const text = await file.text();
        setTextPreviews(prev => ({ ...prev, [id]: text.slice(0, 300) }));
      } catch {
        // ignore
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if (e.target.files) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const previewItems = useMemo(() => {
    if (!selectedFile) return [];
    const item: UploadedItem = {
      id: "preview",
      name: selectedFile.name,
      type: selectedFile.type || "application/octet-stream",
      size: selectedFile.size,
      uploadedAt: Date.now(),
    };
    return [item];
  }, [selectedFile]);

  const handleRemove = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    setFileUrls(prev => {
      const next = { ...prev };
      if (next[id]) {
        URL.revokeObjectURL(next[id]);
        delete next[id];
      }
      return next;
    });
    setTextPreviews(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  return (
    <div className="min-h-screen page-nour text-foreground" dir="rtl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-accent/10 to-transparent" aria-hidden="true" />
      <div className="relative mx-auto max-w-5xl px-4 py-6 space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gradient-gold">مكتب الرفع</h1>
            <p className="mt-2 text-sm text-muted-foreground">ارفع ملفاً واحداً هنا، وسيظهر في المكتب مباشرةً.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="rounded-full border border-border bg-secondary px-4 py-2 text-sm font-bold transition hover:bg-muted">رجوع</button>
            <Link to="/" className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-black transition hover:brightness-95">الذهاب للصفحة الرئيسية</Link>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.5fr,1fr]">
          <section className="card-nour rounded-3xl border border-border p-6 shadow-soft">
            <h2 className="text-xl font-bold mb-4">ارفع ملفك</h2>
            <div
              className={`rounded-3xl border-2 border-dashed p-8 text-center transition ${dragging ? "border-accent bg-accent/10" : "border-border bg-secondary"}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto mb-4 h-12 w-12 text-accent" />
              <p className="text-lg font-bold">اسحب الملف هنا أو اضغط للاختيار</p>
              <p className="mt-2 text-sm text-muted-foreground">أي نوع ملف مقبول. سيظهر في مكتب الرفع بعد الاختيار.</p>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
            </div>

            {message && (
              <div className="mt-4 rounded-2xl bg-success/10 border border-success/40 p-4 text-sm text-success">
                <CheckCircle2 className="inline-block mr-2 mb-0.5" /> {message}
              </div>
            )}

            <div className="mt-6 rounded-3xl bg-secondary p-4">
              <p className="text-sm text-muted-foreground">ملاحظات:</p>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed">
                <li>• يمكنك رفع ملف واحد في كل مرة.</li>
                <li>• سيظل الملف ظاهرًا في قائمة المكتب حتى تحذفه.</li>
                <li>• إذا كان الملف صورة أو صوتًا أو فيديو، يمكنك فتحه مباشرة.</li>
              </ul>
            </div>
          </section>

          <section className="card-nour rounded-3xl border border-border p-6 shadow-soft">
            <h2 className="text-xl font-bold mb-4">معاينة الملف</h2>
            {selectedFile ? (
              <div className="space-y-4">
                <div className="rounded-3xl border border-border p-4 bg-background">
                  <p className="text-sm text-muted-foreground">الملف المحدد</p>
                  <p className="mt-2 font-bold">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedFile.type || "غير معرف"} · {formatSize(selectedFile.size)}</p>
                </div>
                {getPreviewKind(selectedFile.type).startsWith("image") && (
                  <img src={URL.createObjectURL(selectedFile)} alt={selectedFile.name} className="w-full rounded-3xl object-contain" />
                )}
                {getPreviewKind(selectedFile.type) === "audio" && (
                  <audio controls src={URL.createObjectURL(selectedFile)} className="w-full rounded-3xl" />
                )}
                {getPreviewKind(selectedFile.type) === "video" && (
                  <video controls src={URL.createObjectURL(selectedFile)} className="w-full rounded-3xl" />
                )}
                {getPreviewKind(selectedFile.type) === "text" && (
                  <div className="rounded-3xl border border-border p-4 bg-secondary text-sm whitespace-pre-wrap">{textPreviews[selectedFile.name] || "تحميل النص..."}</div>
                )}
              </div>
            ) : (
              <div className="rounded-3xl border border-border p-6 text-center bg-secondary text-muted-foreground">
                اختر ملفًا لعرض معاينة سريعة.
              </div>
            )}
          </section>
        </div>

        <section className="card-nour rounded-3xl border border-border p-6 shadow-soft">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-xl font-bold">مكتب الملفات</h2>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-muted-foreground">{items.length} عنصر</span>
          </div>

          {items.length === 0 ? (
            <div className="rounded-3xl border border-border p-8 text-center text-muted-foreground">لا يوجد ملفات حتى الآن. ارفع ملفاً لتراه هنا.</div>
          ) : (
            <div className="space-y-3">
              {items.map(item => {
                const kind = getPreviewKind(item.type);
                const url = fileUrls[item.id];
                return (
                  <div key={item.id} className="rounded-3xl border border-border p-4 bg-background flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-3xl bg-accent/10 text-accent shadow-soft">
                        {kind === "image" ? <Image className="w-5 h-5" /> : kind === "audio" ? <Play className="w-5 h-5" /> : kind === "video" ? <Video className="w-5 h-5" /> : kind === "text" ? <FileText className="w-5 h-5" /> : <File className="w-5 h-5" />}
                      </span>
                      <div>
                        <p className="font-bold text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.type || "غير معروف"} · {formatSize(item.size)}</p>
                        <p className="text-xs text-muted-foreground">{new Date(item.uploadedAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {url && (kind === "image" || kind === "audio" || kind === "video") && (
                        <a href={url} target="_blank" rel="noreferrer" className="rounded-full bg-accent px-4 py-2 text-xs font-bold text-black transition hover:bg-accent/90">فتح</a>
                      )}
                      <button onClick={() => handleRemove(item.id)} className="rounded-full border border-destructive px-4 py-2 text-xs font-bold text-destructive transition hover:bg-destructive/10">حذف</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
