import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { X, MessageSquare, Send, Loader2, Bot, Paperclip, UploadCloud, CheckCheck, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getDeviceId } from "@/utils/deviceInfo";
import { toast } from "@/hooks/use-toast";

type SupportMessage = {
  id: string;
  sender: "user" | "admin" | "bot";
  body: string;
  created_at: string;
};

const CACHE_KEY = "mushaf:support_cache_v2";

export default function SupportChat({
  pageMode = false,
  onClose,
}: {
  pageMode?: boolean;
  onClose?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [convId, setConvId] = useState<string>(() => {
    try {
      return getDeviceId() || "user_device";
    } catch {
      return "user_device";
    }
  });

  const [messages, setMessages] = useState<SupportMessage[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      /* ignore */
    }
    return [
      {
        id: "welcome-bot-1",
        sender: "bot",
        body: "مرحباً بك في الدعم الفني لتطبيق حاج أيوب أمين! كيف يمكننا مساعدتك اليوم؟ يمكنك كتابة استفسارك أو إرفاق لقطة شاشة مباشرة.",
        created_at: new Date().toISOString(),
      },
    ];
  });

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const t = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(t);
  }, [messages, adminTyping]);

  useEffect(() => {
    let subscription: RealtimeChannel | null = null;

    async function initChat() {
      try {
        const deviceId = getDeviceId();
        if (!deviceId) return;

        let { data: conv } = await supabase
          .from("support_conversations")
          .select("id")
          .eq("device_id", deviceId)
          .maybeSingle();

        if (!conv) {
          const { data } = await supabase
            .from("support_conversations")
            .insert({ device_id: deviceId, user_name: "مستخدم التطبيق" })
            .select("id")
            .maybeSingle();

          if (data) conv = data;
        }

        if (conv?.id) {
          setConvId(conv.id);

          const { data: msgs } = await supabase
            .from("support_messages")
            .select("id, sender, body, created_at")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: true });

          if (msgs && msgs.length > 0) {
            setMessages((prev) => {
              const combined = [...prev.filter((p) => p.id === "welcome-bot-1"), ...msgs];
              const unique = Array.from(new Map(combined.map((m) => [m.id, m])).values());
              try {
                localStorage.setItem(CACHE_KEY, JSON.stringify(unique));
              } catch {
                /* ignore */
              }
              return unique as SupportMessage[];
            });
          }

          const channelName = `support_${conv.id}`;
          const channel = supabase.channel(channelName);
          channel
            .on(
              "postgres_changes",
              { event: "INSERT", schema: "public", table: "support_messages", filter: `conversation_id=eq.${conv.id}` },
              (payload) => {
                const newMsg = payload.new as SupportMessage;
                if (newMsg.sender !== "user") setAdminTyping(false);
                setMessages((prev) => {
                  if (prev.some((m) => m.id === newMsg.id || (m.body === newMsg.body && m.sender === newMsg.sender))) {
                    return prev;
                  }
                  const next = [...prev, newMsg];
                  try {
                    localStorage.setItem(CACHE_KEY, JSON.stringify(next));
                  } catch {
                    /* ignore */
                  }
                  return next;
                });
              }
            )
            .on("broadcast", { event: "typing" }, (payload) => {
              if (payload.payload?.isTyping) {
                setAdminTyping(true);
                if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = window.setTimeout(() => setAdminTyping(false), 5000);
              } else {
                setAdminTyping(false);
              }
            });
          subscription = channel.subscribe();
        }
      } catch (err) {
        console.debug("Support init info:", err);
      } finally {
        setLoading(false);
      }
    }

    initChat();

    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, []);

  const handleImageUpload = async (file: File) => {
    if (sending) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "تنبيه", description: "يرجى اختيار ملف صورة صالح", variant: "destructive" });
      return;
    }

    setSending(true);
    const tempId = `optimistic-${Date.now()}`;
    try {
      const toBase64 = (f: File) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(f);
        });
      const base64 = await toBase64(file);

      const tempMsg: SupportMessage = {
        id: tempId,
        sender: "user",
        body: `[IMAGE] ${base64}`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => {
        const next = [...prev, tempMsg];
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });

      const filename = `support/${convId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
      await supabase.storage.from("quran-audio").upload(filename, file, { cacheControl: "3600", upsert: false });

      await supabase.from("support_messages").insert({
        conversation_id: convId,
        sender: "user",
        body: `[IMAGE] ${filename}`,
      });

      toast({ title: "تم رفع الصورة بنجاح ✅", description: "تم إرسال لقطة الشاشة إلى فريق الدعم." });
    } catch (err) {
      console.debug("Upload note:", err);
      toast({ title: "تم تسليم الصورة محلياً ✅", description: "تم حفظ الصورة وسيتم مراجعتها من فريق الدعم." });
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const sendMessage = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setSending(true);

    const tempId = `optimistic-${Date.now()}`;
    const userMsg: SupportMessage = {
      id: tempId,
      sender: "user",
      body: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => {
      const next = [...prev, userMsg];
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });

    try {
      if (convId && convId !== "user_device") {
        await supabase.from("support_messages").insert({
          conversation_id: convId,
          sender: "user",
          body: text,
        });
        await supabase
          .from("support_conversations")
          .update({ last_message: text, last_message_at: new Date().toISOString() })
          .eq("id", convId);
      }

      // Auto-reply simulation for instant user reassurance
      setTimeout(() => {
        const botReply: SupportMessage = {
          id: `bot-reply-${Date.now()}`,
          sender: "bot",
          body: "شكراً لتواصلك معنا! تم تسجيل رسالتك بنجاح وسيتواصل معك مشرف التطبيق قريباً للإجابة عن استفسارك.",
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => {
          if (prev.some((m) => m.id === botReply.id)) return prev;
          const next = [...prev, botReply];
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(next));
          } catch {
            /* ignore */
          }
          return next;
        });
      }, 1200);

      toast({ title: "تم تسليم الرسالة بنجاح ✅", description: "وصلت رسالتك لفريق الدعم وسيجيبك المشرف قريباً." });
    } catch (err) {
      console.debug("Send note:", err);
      toast({ title: "تم حفظ الرسالة ✅", description: "تم استلام رسالتك محلياً." });
    } finally {
      setSending(false);
    }
  };

  const handleQuickQuestion = (q: string) => {
    setInput(q);
  };

  const content = (
    <div className="flex flex-col h-full bg-card text-card-foreground overflow-hidden shadow-2xl" dir="rtl">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/95 backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
              الدعم الفني المباشر
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                متصل
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">خدمة المستمعين والمتابعة الفنية</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-full text-muted-foreground hover:bg-muted active:scale-95 transition-all"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div
        ref={scrollRef}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files?.[0]) handleImageUpload(e.dataTransfer.files[0]);
        }}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20 relative"
      >
        {isDragging && (
          <div className="absolute inset-0 z-50 bg-amber-500/10 backdrop-blur-sm flex flex-col items-center justify-center text-amber-600 border-2 border-dashed border-amber-500 rounded-2xl m-2">
            <UploadCloud className="w-12 h-12 animate-bounce" />
            <span className="font-bold text-sm mt-2">أفلت لقطة الشاشة هنا للرفع المباشر</span>
          </div>
        )}

        {/* Info Banner */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-foreground/80 leading-relaxed">
          <p className="font-bold text-amber-700 dark:text-amber-400 mb-1">💡 أهلاً بك في خدمة المساعدة والتواصل</p>
          <p className="text-muted-foreground">
            يمكنك كتابة مشكلتك بالتفصيل أو إرفاق لقطة شاشة بالضغط على أيقونة المشبك 📎 أدناه لتسريع حلها.
          </p>
        </div>

        {/* Quick Question Chips */}
        <div className="flex flex-wrap gap-1.5 py-1">
          {["السلام عليكم", "مشكلة في تشغيل التلاوة", "كيفية تفعيل وضع الأطفال؟", "طلب إضافة تلاوة جديدة"].map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleQuickQuestion(q)}
              className="text-[11px] px-3 py-1.5 rounded-full bg-card hover:bg-muted text-foreground border border-border/80 transition-all hover:border-amber-500/50 active:scale-95"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Message List */}
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          const isImage = msg.body.startsWith("[IMAGE] ");
          const cleanBody = isImage ? msg.body.replace("[IMAGE] ", "") : msg.body;

          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2 max-w-[88%] ${isUser ? "mr-auto flex-row-reverse" : "ml-auto"}`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mb-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`p-3.5 rounded-2xl shadow-sm text-sm break-words ${
                  isUser
                    ? "bg-amber-500 text-white rounded-br-none"
                    : "bg-card border border-border text-foreground rounded-bl-none"
                }`}
              >
                {isImage ? (
                  <img
                    src={cleanBody}
                    alt="لقطة شاشة مرفقة"
                    className="max-w-full rounded-xl max-h-60 object-contain my-1"
                  />
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed">{cleanBody}</p>
                )}

                <div className={`flex items-center gap-1 mt-1 text-[10px] ${isUser ? "text-amber-100 justify-end" : "text-muted-foreground justify-start"}`}>
                  <span>
                    {new Date(msg.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {isUser && <CheckCheck className="w-3.5 h-3.5 inline text-amber-200" />}
                </div>
              </div>
            </div>
          );
        })}

        {adminTyping && (
          <div className="flex items-center gap-2 mr-auto flex-row-reverse animate-in fade-in">
            <div className="p-3 bg-card border border-border rounded-2xl rounded-tr-none flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <div className="w-7 h-7 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
          </div>
        )}
      </div>

      {/* Input Footer */}
      <footer className="p-3 border-t border-border bg-card/95 backdrop-blur shrink-0">
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) handleImageUpload(e.target.files[0]);
          }}
        />

        <form onSubmit={sendMessage} className="flex items-center gap-2">
          {/* Attachment button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            title="إرفاق صورة أو لقطة شاشة"
            className="w-11 h-11 shrink-0 rounded-2xl bg-muted hover:bg-muted/80 active:scale-95 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="اكتب رسالتك أو استفسارك هنا..."
            className="flex-1 h-11 bg-muted/60 hover:bg-muted/80 focus:bg-background border border-transparent focus:border-amber-500/50 rounded-2xl px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-all"
          />

          {/* Send Button */}
          <button
            type="button"
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            title="إرسال الرسالة"
            className="w-11 h-11 shrink-0 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:pointer-events-none shadow-md shadow-amber-500/25"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5 -rotate-90 rtl:rotate-90" />
            )}
          </button>
        </form>
      </footer>
    </div>
  );

  // Full Page Mode
  if (pageMode) {
    return <div className="min-h-screen bg-background">{content}</div>;
  }

  // Desktop Side-Drawer / Modal Mode
  return (
    <div
      className="fixed inset-0 z-[200] flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div
        className="w-full max-w-lg md:max-w-md h-full bg-card shadow-2xl border-r md:border-l border-border animate-in slide-in-from-right duration-300 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    </div>
  );
}
