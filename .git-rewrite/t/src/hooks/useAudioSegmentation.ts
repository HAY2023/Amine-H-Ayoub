import { useState, useCallback } from "react";
import { supabase } from "../integrations/supabase/client";

export interface ProcessAudioRequest {
  storageUrl: string;
  surahNumber: number;
  ayahCount: number;
  sessionId?: string;
  referenceTeacher?: string;
  referenceKids?: string;
  isStereo?: boolean;
}

export interface AudioSegment {
  start: number;
  end: number;
  speaker: "teacher" | "kids";
  ayah?: number;
}

export interface ProcessAudioResponse {
  resultId: string;
  segments: AudioSegment[];
  duration: number;
  processingTimeMs: number;
}

export function useAudioSegmentation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processAudio = useCallback(
    async (request: ProcessAudioRequest): Promise<ProcessAudioResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        // Call Edge Function
        const { data, error: callError } = await supabase.functions.invoke("process-audio", {
          body: request,
        });

        if (callError) {
          throw new Error(callError.message || "Failed to process audio");
        }

        if (!data?.success) {
          throw new Error(data?.error || "Processing failed");
        }

        return {
          resultId: data.resultId,
          segments: data.segments || [],
          duration: data.duration || 0,
          processingTimeMs: data.processingTimeMs || 0,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const getResults = useCallback(
    async (sessionId: string) => {
      try {
        const { data, error: queryError } = await supabase
          .from("audio_segmentation_results")
          .select("*")
          .eq("session_id", sessionId)
          .single();

        if (queryError) {
          throw new Error(queryError.message);
        }

        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch results";
        setError(message);
        throw err;
      }
    },
    []
  );

  return {
    processAudio,
    getResults,
    isLoading,
    error,
  };
}
