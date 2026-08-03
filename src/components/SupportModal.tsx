import { useState, useEffect, useRef } from "react";
import { X, MessageSquare, Send, Loader2, Bot } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getDeviceId } from "@/utils/deviceInfo";

interface SupportMessage {
  id: string;
  sender: "user" | "admin" | "bot";
  body: string;
  created_at: string;
}

export default function SupportModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [convId, setConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  // Scroll to bottom on new messages or typing indicator
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
    let subscription: any = null;

    async function initChat() {
      try {
        const deviceId = getDeviceId();

        // 1. Get or create conversation
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
            .single();
          conv = data;
        }

        if (conv) {
          setConvId(conv.id);

          // 2. Fetch messages
          const { data: msgs } = await supabase
            .from("support_messages")
            .select("id, sender, body, created_at")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: true });

          if (msgs) {
            setMessages(msgs as SupportMessage[]);
          }

          // 3. Subscribe to new messages (optional but recommended for chat)
          subscription = supabase
            .channel(`support_${conv.id}`)
            .on(
              "postgres_changes",
              { event: "INSERT", schema: "public", table: "support_messages", filter: `conversation_id=eq.${conv.id}` },
              (payload) => {
                const newMsg = payload.new as SupportMessage;
                // If it's from admin, clear typing indicator
                if (newMsg.sender !== "user") {
                  setAdminTyping(false);
                }
                setMessages((prev) => {
                  // Prevent duplicate if we already added it optimistically
                  if (prev.some(m => m.id === newMsg.id || (m.body === newMsg.body && m.sender === newMsg.sender))) {
                    // Update the fake ID with the real one
                    return prev.map(m => (m.body === newMsg.body && m.sender === newMsg.sender) ? newMsg : m);
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
            )
            .subscribe();
        }
      } catch (err) {
        console.error("Failed to init support chat", err);
      } finally {
        setLoading(false);
      }
    }
    initChat();

    // Polling fallback
    const pollInterval = setInterval(async () => {
      if (!convId) return;
      try {
        const { data: msgs } = await supabase
          .from("support_messages")
          .select("id, sender, body, created_at")
          .eq("conversation_id", convId)
          .order("created_at", { ascending: true });
        if (msgs) {
          setMessages(prev => {
            // Only update if there's a new message to avoid unnecessary re-renders
            if (prev.length !== msgs.length) {
              // clear typing indicator if we received an admin message
              const lastMsg = msgs[msgs.length - 1];
              if (lastMsg && lastMsg.sender !== "user") setAdminTyping(false);
              return msgs as SupportMessage[];
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

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !convId || sending) return;

    setInput("");
    setSending(true);

    try {
      // Optimistic UI update
      const tempMsg: SupportMessage = {
        id: Date.now().toString(),
        sender: "user",
        body: text,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, tempMsg]);

      await supabase.from("support_messages").insert({
        conversation_id: convId,
        sender: "user",
        body: text,
      });
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end sm:justify-end sm:items-end sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300" dir="rtl">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-card w-full h-full sm:h-[85vh] sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl border border-border/50 overflow-hidden flex flex-col animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:slide-in-from-right-full duration-300">

        {/* شريط السحب العلوي للجوال */}
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>

        <header className="flex-none flex items-center justify-between p-4 pb-3 border-b border-border/40">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-accent-foreground shadow-inner">
              <MessageSquare className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-extrabold text-lg text-foreground leading-tight">الدعم الفني</h2>
              <p className="text-xs text-muted-foreground">نحن هنا لمساعدتك والإجابة على استفساراتك</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:brightness-95 active:scale-95 text-secondary-foreground transition-all">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50" ref={scrollRef}>
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
              <p className="text-sm text-muted-foreground">جاري فتح المحادثة...</p>
            </div>
          ) : (
            <>
              {/* رسالة ترحيبية */}
              <div className="flex items-start gap-2 max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-blue-600" />
                </div>
                <div className="bg-white border shadow-sm rounded-2xl rounded-tr-sm p-3">
                  <p className="text-sm text-foreground">السلام عليكم! مرحباً بك في الدعم الفني. كيف يمكننا مساعدتك اليوم؟</p>
                </div>
              </div>

              {messages.map((msg, idx) => {
                const isUser = msg.sender === "user";
                return (
                  <div key={msg.id || idx} className={`flex items-start gap-2 max-w-[85%] ${isUser ? 'mr-auto flex-row-reverse' : 'ml-auto'}`}>
                    {!isUser && (
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-blue-600" />
                      </div>
                    )}
                    <div className={`${isUser ? 'bg-accent text-accent-foreground rounded-tl-sm' : 'bg-white border text-foreground rounded-tr-sm'} shadow-sm rounded-2xl p-3`}>
                      <p className="text-sm">{msg.body}</p>
                      <span className={`text-[10px] opacity-70 mt-1 block ${isUser ? 'text-right' : 'text-left'}`}>
                        {new Date(msg.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* مؤشر الكتابة (Typing Indicator) */}
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

        <div className="flex-none p-3 bg-card border-t border-border/40">
          <form onSubmit={sendMessage} className="flex items-center gap-2">
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
  );
}
