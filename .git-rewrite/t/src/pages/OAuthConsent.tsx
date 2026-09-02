import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

// The @supabase/supabase-js `auth.oauth` namespace is beta. Narrow it locally
// so TypeScript can call the three methods without diving into node_modules.
type AuthorizationDetails = {
  client?: { name?: string; redirect_uri?: string; client_uri?: string };
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthApi = {
  getAuthorizationDetails(id: string): Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization(id: string): Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization(id: string): Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
};
const oauth = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("الرابط غير مكتمل: authorization_id مفقود");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      try {
        const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) return setError(error.message);
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) {
          window.location.href = immediate;
          return;
        }
        setDetails(data);
      } catch (err: unknown) {
        if (active) setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    try {
      const { data, error } = approve
        ? await oauth.approveAuthorization(authorizationId)
        : await oauth.denyAuthorization(authorizationId);
      if (error) {
        setBusy(false);
        return setError(error.message);
      }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) {
        setBusy(false);
        return setError("لم يرجع خادم التفويض رابطًا للتحويل.");
      }
      window.location.href = target;
    } catch (err: unknown) {
      setBusy(false);
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  if (error) {
    return (
      <main dir="rtl" className="min-h-screen flex items-center justify-center p-4 bg-[#F5F5DC]">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 border border-red-200">
          <h1 className="text-xl font-bold text-red-700 mb-2">تعذر تحميل طلب التفويض</h1>
          <p className="text-sm text-gray-700">{error}</p>
        </div>
      </main>
    );
  }

  if (!details) {
    return (
      <main dir="rtl" className="min-h-screen flex items-center justify-center p-4 bg-[#F5F5DC]">
        <p className="text-[#5b4636]">جارٍ التحميل…</p>
      </main>
    );
  }

  const clientName = details.client?.name ?? "تطبيق خارجي";

  return (
    <main dir="rtl" className="min-h-screen flex items-center justify-center p-4 bg-[#F5F5DC]">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 border border-[#D2B48C]/40">
        <h1 className="text-2xl font-bold text-[#5b4636] mb-2">
          ربط {clientName} بحسابك
        </h1>
        <p className="text-sm text-gray-700 mb-4">
          سيتمكّن <strong>{clientName}</strong> من استخدام أدوات هذا التطبيق نيابةً عنك
          أثناء تسجيل دخولك.
        </p>
        <ul className="text-sm text-gray-700 list-disc pr-5 space-y-1 mb-6">
          <li>الاطلاع على معلومات ملفك الأساسية</li>
          <li>استخدام أدوات المصحف المتاحة</li>
        </ul>
        <p className="text-xs text-gray-500 mb-6">
          لا يتخطى هذا الربط سياسات الأذونات في التطبيق.
        </p>
        <div className="flex gap-3">
          <Button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 bg-[#D2B48C] hover:bg-[#c1a479] text-white"
          >
            الموافقة والربط
          </Button>
          <Button disabled={busy} variant="outline" onClick={() => decide(false)} className="flex-1">
            إلغاء
          </Button>
        </div>
      </div>
    </main>
  );
}
