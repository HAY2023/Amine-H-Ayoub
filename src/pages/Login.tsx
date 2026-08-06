import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

function sanitizeNext(raw: string | null): string {
  if (!raw) return "/";
  try {
    // Accept only same-origin relative paths.
    if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
    return raw;
  } catch {
    return "/";
  }
}

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = sanitizeNext(params.get("next"));
  const [mode, setMode] = useState<"sign_in" | "sign_up">("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) navigate(next, { replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, session) => {
      if (session) navigate(next, { replace: true });
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate, next]);

  async function signInWithGoogle() {
    setBusy(true);
    const returnTo = `${window.location.origin}/login?next=${encodeURIComponent(next)}`;
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: returnTo });
    if (result.redirected) return;
    if (result.error) {
      setBusy(false);
      toast({ title: "تعذر تسجيل الدخول عبر Google", description: String(result.error.message ?? result.error) });
    }
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "sign_in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login?next=${encodeURIComponent(next)}`,
          },
        });
        if (error) throw error;
        toast({ title: "تحقق من بريدك الإلكتروني", description: "أرسلنا رسالة تأكيد" });
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      toast({ title: "خطأ", description: error.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen flex items-center justify-center p-4 bg-[#F5F5DC]">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 border border-[#D2B48C]/40">
        <h1 className="text-2xl font-bold text-center mb-2 text-[#5b4636]">تسجيل الدخول</h1>
        <p className="text-center text-sm text-gray-600 mb-6">
          سجّل الدخول للاستمرار
        </p>

        <Button
          type="button"
          onClick={signInWithGoogle}
          disabled={busy}
          className="w-full mb-4 bg-white text-gray-800 border border-gray-300 hover:bg-gray-50"
        >
          الدخول عبر Google
        </Button>

        <div className="flex items-center gap-2 my-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-500">أو</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <form onSubmit={submitEmail} className="space-y-3">
          <Input type="email" placeholder="البريد الإلكتروني" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" placeholder="كلمة السر" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" disabled={busy} className="w-full bg-[#D2B48C] hover:bg-[#c1a479] text-white">
            {mode === "sign_in" ? "دخول" : "إنشاء حساب"}
          </Button>
        </form>

        <button
          type="button"
          className="mt-4 w-full text-sm text-[#5b4636] underline"
          onClick={() => setMode((m) => (m === "sign_in" ? "sign_up" : "sign_in"))}
        >
          {mode === "sign_in" ? "ليس لديك حساب؟ سجّل الآن" : "لديك حساب؟ سجّل الدخول"}
        </button>
      </div>
    </main>
  );
}
