import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessAudioRequest {
  storageUrl: string;
  surahNumber: number;
  ayahCount: number;
  sessionId?: string;
  referenceTeacher?: string;
  referenceKids?: string;
  isStereo?: boolean;
}

interface Segment {
  start: number;
  end: number;
  speaker: "teacher" | "kids";
  ayah?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ProcessAudioRequest = await req.json();
    const { storageUrl, surahNumber, ayahCount, sessionId, referenceTeacher, referenceKids, isStereo } = body;

    if (!storageUrl || !surahNumber || !ayahCount) {
      throw new Error("Missing required fields: storageUrl, surahNumber, ayahCount");
    }

    const PYTHON_SERVICE_URL = Deno.env.get("PYTHON_SERVICE_URL") || "http://localhost:8000";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase configuration missing");
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Call Python microservice
    console.log(`Calling Python service: ${PYTHON_SERVICE_URL}/process-audio`);

    const pythonResponse = await fetch(`${PYTHON_SERVICE_URL}/process-audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audioUrl: storageUrl,
        surahNumber,
        ayahCount,
        sessionId,
        referenceTeacher,
        referenceKids,
        isStereo: isStereo || false,
      }),
    });

    if (!pythonResponse.ok) {
      const errorText = await pythonResponse.text();
      console.error(`Python service error: ${pythonResponse.status} - ${errorText}`);
      throw new Error(`Python service error: ${pythonResponse.status}`);
    }

    const result = await pythonResponse.json();

    // Store result in database
    const { data, error } = await supabase
      .from("audio_segmentation_results")
      .insert({
        session_id: sessionId || `session_${Date.now()}`,
        surah_number: surahNumber,
        storage_url: storageUrl,
        status: "completed",
        segments: result.segments,
        processing_time_ms: result.processingTimeMs,
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      throw new Error(`Failed to store results: ${error.message}`);
    }

    console.log(`✅ Processed audio: ${result.segments.length} segments found`);

    return new Response(
      JSON.stringify({
        success: true,
        resultId: data.id,
        segments: result.segments,
        duration: result.duration,
        processingTimeMs: result.processingTimeMs,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error.message);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
