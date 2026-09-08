/**
 * كتلة كود HTML خارجي تُعرض أسفل قسم الألعاب (تحت مكان الحماس/التحفيز).
 * المحتوى يُدار من صفحة admin.html الخارجية.
 */
import { useEffect, useState } from "react";
import { getExternalHtml } from "../data/titles";

export default function ExternalHtmlBlock() {
  const [html, setHtml] = useState(() => getExternalHtml());

  useEffect(() => {
    const h = () => setHtml(getExternalHtml());
    window.addEventListener("mushaf:externalHtml", h);
    window.addEventListener("focus", h);
    return () => {
      window.removeEventListener("mushaf:externalHtml", h);
      window.removeEventListener("focus", h);
    };
  }, []);

  if (!html || !html.trim()) return null;
  return (
    <div className="mx-auto max-w-2xl px-4 mt-6 mb-4">
      <div className="rounded-2xl overflow-hidden border border-border bg-card" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}