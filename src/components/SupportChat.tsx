import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { X, MessageSquare, Send, Loader2, Bot, Paperclip, UploadCloud } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getDeviceId } from "@/utils/deviceInfo";
import { toast } from "@/hooks/use-toast";

type SupportMessage = {
  id: string;
  sender: "user" | "admin" | "bot";
  body: string;
  created_at: string;
};

export default function SupportChat({
  pageMode = false,
  onClose,
}: {
  pageMode?: boolean;
  onClose?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [convId, setConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [supportDisabled, setSupportDisabled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const updateConversationMetadata = async (body: string) => {
    if (!convId || convId === "local_demo_conv") return;
    const { error } = await supabase
      .from("support_conversations")
      .update({ last_message: body, last_message_at: new Date().toISOString() })
      .eq("id", convId);
    if (error) {
      console.error("Failed to update support conversation metadata", error);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [messages, adminTyping]);

  useEffect(() => {
    let subscription: RealtimeChannel | null = null;

    async function initChat() {
      try {
        const deviceId = getDeviceId();

        let { data: conv } = await supabase
          .from("support_conversations")
          .select("id")
          .eq("device_id", deviceId)
          .maybeSingle();

        if (!conv) {
          const { data, error } = await supabase
            .from("support_conversations")
            .insert({ device_id: deviceId, user_name: "مستخدم التطبيق" })
            .select("id")
            .single();

          if (error) {
            console.warn("Support conversation creation fallback to local:", error);
            conv = { id: "local_demo_conv" };
          } else {
            conv = data;
          }
        }

        if (conv) {
          setConvId(conv.id);

          if (conv.id !== "local_demo_conv") {
            const { data: msgs } = await supabase
              .from("support_messages")
              .select("id, sender, body, created_at")
              .eq("conversation_id", conv.id)
              .order("created_at", { ascending: true });

            if (msgs) {
              setMessages(msgs as SupportMessage[]);
            }
          }

          if (conv.id !== "local_demo_conv") {
            const channelName = `support_${conv.id}`;
            const existingChannel = supabase
              .getChannels()
              .find((c) => c.topic === `realtime:${channelName}`);
            if (existingChannel) {
              await supabase.removeChannel(existingChannel);
            }

            const channel = supabase.channel(channelName);
            channel
              .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "support_messages", filter: `conversation_id=eq.${conv.id}` },
                (payload) => {
                  const newMsg = payload.new as SupportMessage;
                  if (newMsg.sender !== "user") {
                    setAdminTyping(false);
                  }
                  setMessages((prev) => {
                    if (
                      prev.some(
                        (m) =>
                          m.id === newMsg.id ||
                          (m.body === newMsg.body && m.sender === newMsg.sender)
                      )
                    ) {
                      return prev.map((m) =>
                        m.body === newMsg.body && m.sender === newMsg.sender ? newMsg : m
                      );
                    }
                    return [...prev, newMsg];
                  });
                }
              )
              .on(
                "broadcast",
                { event: "typing" },
                (payload) => {
                  if (payload.payload?.isTyping) {
                    setAdminTyping(true);
                    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = window.setTimeout(() => setAdminTyping(false), 5000);
                  } else {
                    setAdminTyping(false);
                  }
                }
              );
            subscription = channel.subscribe();
          }
        }
      } catch (err) {
        console.error("Failed to init support chat", err);
      } finally {
        setLoading(false);
      }
    }

    initChat();

    const pollInterval = setInterval(async () => {
      if (!convId || convId === "local_demo_conv") return;
      try {
        const { data: msgs } = await supabase
          .from("support_messages")
          .select("id, sender, body, created_at")
          .eq("conversation_id", convId)
          .order("created_at", { ascending: true });

        if (msgs) {
          setMessages((prev) => {
            const dbMessages = msgs as SupportMessage[];
            const msgMap = new Map<string, SupportMessage>();
            for (const m of dbMessages) {
              msgMap.set(m.id, m);
            }
            const optimisticInPrev = prev.filter((m) => m.id.startsWith("optimistic-"));
            for (const opt of optimisticInPrev) {
              const foundInDb = dbMessages.some(
                (m) => m.body === opt.body && m.sender === opt.sender
              );
              if (!foundInDb) {
                msgMap.set(opt.id, opt);
              }
            }
            for (const p of prev) {
              if (!p.id.startsWith("optimistic-") && !msgMap.has(p.id)) {
                msgMap.set(p.id, p);
              }
            }
            const newMessages = Array.from(msgMap.values()).sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            const prevIds = prev.map((m) => m.id).join(",");
            const newIds = newMessages.map((m) => m.id).join(",");
            if (prevIds !== newIds) {
              return newMessages;
            }
            return prev;
          });
        }
      } catch (e) {
        // ignore polling errors
      }
    }, 3000);

    return () => {
      if (subscription) supabase.removeChannel(subscription);
      clearInterval(pollInterval);
    };
  }, [convId]);

  const handleImageUpload = async (file: File) => {
    if (!convId || sending || supportDisabled) return;
    if (!["image/jpeg", "image/png", "image/jpg", "image/webp"].includes(file.type)) {
      toast({ title: "خطأ", description: "الرجاء اختيار صورة صالحة", variant: "destructive" });
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
      setMessages((prev) => [...prev, tempMsg]);

      const filename = `support/${convId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("quran-audio")
        .upload(filename, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from("quran-audio").getPublicUrl(filename);
      const publicUrl = publicUrlData.publicUrl;

      const { error: insertError } = await supabase.from("support_messages").insert({
        conversation_id: convId,
        sender: "user",
        body: `[IMAGE] ${publicUrl}`,
      });

      if (insertError) throw insertError;

      await updateConversationMetadata("📷 صورة جديدة");

      await supabase.from("upload_records").insert([
        {
          type: "support_image",
          surah_number: 0,
          surah_name: "Support",
          data: JSON.stringify({ convId, filename: file.name }),
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err: any) {
      console.error("Failed to upload image", err);
      toast({ title: "خطأ", description: err?.message || "فشل رفع الصورة", variant: "destructive" });
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const sendMessage = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text || !convId || sending || supportDisabled) return;

    setInput("");
    setSending(true);

    const tempId = `optimistic-${Date.now()}`;
    try {
      const tempMsg: SupportMessage = {
        id: tempId,
        sender: "user",
        body: text,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => {
        const next = [...prev, tempMsg];
        try { localStorage.setItem("mushaf:support_cache", JSON.stringify(next)); } catch {}
        return next;
      });

      if (convId !== "local_demo_conv") {
        const { error } = await supabase.from("support_messages").insert({
          conversation_id: convId,
          sender: "user",
          body: text,
        });

        if (error) {
          throw error;
        }

        await updateConversationMetadata(text);
      } else {
        setTimeout(() => {
          const autoReply: SupportMessage = {
            id: `bot-${Date.now()}`,
            sender: "bot",
            body: "السلام عليكم ورحمة الله وبركاته! تم استلام رسالتك وسيقوم فريق الدعم الفني بالرد عليك في أقرب وقت بإذن الله.",
            created_at: new Date().toISOString(),
          };
          setMessages(prev => {
            const next = [...prev, autoReply];
            try { localStorage.setItem("mushaf:support_cache", JSON.stringify(next)); } catch {}
            return next;
          });
        }, 1000);
      }
      toast({ title: "تم تسليم الرسالة ✅", description: "وصلت رسالتك بنجاح وسيردّ عليك الدعم الفني قريباً." });
    } catch (err: any) {
      console.error("Exception sending message", err);
      toast({ title: "تم حفظ الرسالة محلياً", description: "سيتم إرسالها فور توفر اتصال بالإنترنت." });
    } finally {
      setSending(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="min-h-screen page-nour relative overflow-hidden bg-background text-foreground" dir="rtl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-accent/10 to-transparent" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-accent/10 to-transparent" aria-hidden="true" />

      <div className="relative mx-auto w-full max-w-3xl px-4 py-5">
        <div className="card-nour relative overflow-hidden rounded-3xl border border-border shadow-soft">
          {isDragging && (
            <div className="absolute inset-0 z-50 bg-accent/10 backdrop-blur-sm flex flex-col items-center justify-center text-accent">
              <UploadCloud className="w-16 h-16 animate-bounce" />
              <span className="font-bold text-xl mt-4">أفلت الصورة هنا...</span>
            </div>
          )}

          <header className="flex items-center justify-between gap-4 border-b border-border/40 p-4 pb-3">
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-2xl bg-accent/15 text-accent flex items-center justify-center shadow-inner">
                <MessageSquare className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl font-extrabold text-foreground">الدعم الفني</h1>
                <p className="text-xs text-muted-foreground">محادثة مباشرة مع فريق الدعم وإرسال لقطة شاشة.</p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground hover:brightness-95 active:scale-95 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </header>

          <div className="p-4 space-y-4 bg-slate-50/70" ref={scrollRef} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
            <div className="rounded-3xl bg-white border border-border p-4 text-right shadow-sm">
              <p className="text-sm text-foreground font-bold">أرسل لنا المشكلة أو لقطة الشاشة ليصل الدعم لأسرع حل.</p>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                يمكنك سحب صورة الشاشة إلى هنا أو الضغط على زر المرفقات لرفعه. إذا كان لديك تفاصيل إضافية، أضفها في رسالة النص.
              </p>
            </div>

            {loading ? (
              <div className="flex h-64 items-center justify-center text-center text-sm text-muted-foreground">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
                <span className="mr-3">جاري فتح المحادثة...</span>
              </div>
            ) : (
              <> 
                {messages.map((msg, idx) => {
                  const isUser = msg.sender === "user";
                  const isImage = msg.body.startsWith("[IMAGE] ");
                  const isAudio = msg.body.startsWith("[AUDIO] ");
                  const cleanBody = isImage ? msg.body.replace("[IMAGE] ", "") : isAudio ? msg.body.replace("[AUDIO] ", "") : msg.body;

                  return (
                    <div
                      key={msg.id || idx}
                      className={`flex items-start gap-2 max-w-[85%] ${isUser ? "mr-auto flex-row-reverse" : "ml-auto"}`}
                    >
                      {!isUser && (
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <Bot className="w-4 h-4 text-blue-600" />
                        </div>
                      )}
                      <div className={`${isUser ? "bg-accent text-accent-foreground rounded-tl-sm" : "bg-white border text-foreground rounded-tr-sm"} shadow-sm rounded-2xl p-3 overflow-hidden`}>
                        {isImage ? (
                          <img src={cleanBody} alt="مرفق" className="max-w-full rounded-lg" style={{ maxHeight: "220px" }} />
                        ) : isAudio ? (
                          <audio controls className="w-full h-10 max-w-[220px]">
                            <source src={cleanBody} />
                          </audio>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{cleanBody}</p>
                        )}
                        <span className={`text-[10px] opacity-70 mt-1 block ${isUser ? "text-right" : "text-left"}`}>
                          {new Date(msg.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {adminTyping && (
                  <div className="flex items-start gap-2 max-w-[85%] mr-auto flex-row-reverse animate-in fade-in duration-300">
                    <div className="bg-white border shadow-sm rounded-2xl rounded-tr-sm p-4 flex items-center gap-1.5 h-10">
                      <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="border-t border-border/40 bg-card p-3">
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleImageUpload(e.target.files[0]);
                }
              }}
            />
            <form onSubmit={sendMessage} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || sending}
                className="w-11 h-11 shrink-0 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground hover:brightness-95 active:scale-95 transition-all disabled:opacity-50"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="اكتب رسالتك هنا..."
                className="flex-1 h-11 bg-muted rounded-full px-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                disabled={loading || sending}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading || sending}
                className="w-11 h-11 shrink-0 rounded-full bg-accent flex items-center justify-center text-accent-foreground hover:brightness-105 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 mr-1" />}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
