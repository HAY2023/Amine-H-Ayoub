// AI-based ayah splitter using Lovable AI (Gemini supports audio understanding).
// Receives { audioUrl, surahName, ayahCount } and returns precise segment timestamps.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { audioUrl, surahName, ayahCount } = await req.json();
    if (!audioUrl) throw new Error("audioUrl required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    // Download audio and base64-encode (Gemini accepts inline audio).
    console.log("Fetching audio:", audioUrl);
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) throw new Error(`Audio fetch failed: ${audioRes.status}`);
    const audioBuf = new Uint8Array(await audioRes.arrayBuffer());
    // base64 encode in chunks to avoid stack overflow
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < audioBuf.length; i += chunk) {
      binary += String.fromCharCode(...audioBuf.subarray(i, i + chunk));
    }
    const base64 = btoa(binary);
    console.log("Audio size:", audioBuf.length, "base64 len:", base64.length);

    const systemPrompt = `أنت خبير عالمي في تحليل التلاوات القرآنية برواية ورش. خذ وقتك في الاستماع بعناية فائقة عدة مرات للمقطع الصوتي قبل الإجابة. مهمتك:
1. تحديد كل آية على حدة بدقة الميلي ثانية.
2. التمييز بين صوت المعلم (رجل بالغ، نبرة هادئة) وصوت الأطفال (أصوات مرتفعة، جماعية).
3. تجاهل الصمت الكامل في حساب البدايات والنهايات (ابدأ المقطع مع أول صوت، انهيه مع آخر صوت).
4. لا تتداخل المقاطع زمنياً. كل مقطع له بداية ونهاية واضحة.
5. الترتيب الطبيعي: معلم آية 1 → أطفال آية 1 → معلم آية 2 → أطفال آية 2 ... وهكذا.
6. تحقق مرتين من النتيجة قبل إرسالها.`;

    const userText = `حلّل بدقة قصوى تلاوة سورة "${surahName}" (${ayahCount} آيات). أرجع كل المقاطع (معلم + أطفال لكل آية) بترتيبها الزمني الصحيح. استخدم الأداة المرفقة.`;

    const body: Record<string, unknown> = {
      model: "google/gemini-3.1-pro-preview",
      reasoning: { effort: "xhigh" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userText },
            {
              type: "input_audio",
              input_audio: { data: base64, format: "mp3" },
            },
          ],
        },
      ],
      tools: [{
        type: "function",
        function: {
          name: "return_ayah_segments",
          description: "Return precise segment timestamps for each ayah recitation",
          parameters: {
            type: "object",
            properties: {
              segments: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    ayahIndex: { type: "integer", description: "1-based ayah number" },
                    speaker: { type: "string", enum: ["teacher", "kids"] },
                    start: { type: "number", description: "start time in seconds" },
                    end: { type: "number", description: "end time in seconds" },
                  },
                  required: ["ayahIndex", "speaker", "start", "end"],
                  additionalProperties: false,
                },
              },
            },
            required: ["segments"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "return_ayah_segments" } },
    };

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI error:", aiRes.status, txt);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز الحد، حاول لاحقاً" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "نفذ الرصيد، أضف رصيداً في الإعدادات" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `AI error ${aiRes.status}: ${txt}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("no tool call:", JSON.stringify(data).slice(0, 500));
      throw new Error("AI did not return segments");
    }
    const args = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("split error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
