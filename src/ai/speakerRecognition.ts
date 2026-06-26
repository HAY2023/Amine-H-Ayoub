/**
 * Speaker Recognition Engine
 * 
 * يستخدم بصمات MFCC للتعرف على المتحدث (معلم أو طفل).
 * يحفظ البصمات المرجعية في Supabase لتكون متاحة لجميع أعضاء الفريق.
 */

import { createSpeakerEmbedding, cosineSimilarity } from "./mfcc";
import { supabase } from "../lib/supabase";

export type SpeakerType = "teacher" | "kids";

export interface SpeakerProfile {
  type: SpeakerType;
  embedding: number[];  // stored as regular array for JSON serialization
  enrolledAt: string;
}

const SPEAKER_PROFILES_KEY = "mushaf:speakerProfiles:v1";

// ── Load / Save Profiles ──

export async function loadProfiles(): Promise<SpeakerProfile[]> {
  // Try Supabase first
  try {
    const { data } = await supabase
      .from("store")
      .select("value")
      .eq("key", SPEAKER_PROFILES_KEY)
      .single();
    if (data?.value) {
      const profiles = data.value as SpeakerProfile[];
      // Cache locally
      localStorage.setItem(SPEAKER_PROFILES_KEY, JSON.stringify(profiles));
      return profiles;
    }
  } catch {
    // Fallback to localStorage
  }

  try {
    const raw = localStorage.getItem(SPEAKER_PROFILES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveProfile(profile: SpeakerProfile): Promise<void> {
  const profiles = await loadProfiles();
  
  // Replace existing profile of same type, or add new
  const idx = profiles.findIndex(p => p.type === profile.type);
  if (idx >= 0) {
    profiles[idx] = profile;
  } else {
    profiles.push(profile);
  }

  // Save locally
  localStorage.setItem(SPEAKER_PROFILES_KEY, JSON.stringify(profiles));

  // Sync to Supabase
  try {
    await supabase.from("store").upsert({
      key: SPEAKER_PROFILES_KEY,
      value: profiles,
    });
  } catch (e) {
    console.error("Failed to sync speaker profiles:", e);
  }
}

export async function deleteProfile(type: SpeakerType): Promise<void> {
  const profiles = await loadProfiles();
  const filtered = profiles.filter(p => p.type !== type);
  localStorage.setItem(SPEAKER_PROFILES_KEY, JSON.stringify(filtered));
  try {
    await supabase.from("store").upsert({
      key: SPEAKER_PROFILES_KEY,
      value: filtered,
    });
  } catch (e) {
    console.error("Failed to sync speaker profiles:", e);
  }
}

// ── Enrollment ──

/**
 * Enroll a speaker by extracting their voice embedding from audio samples.
 */
export async function enrollSpeaker(
  audioSamples: Float32Array,
  sampleRate: number,
  type: SpeakerType,
): Promise<SpeakerProfile> {
  const embedding = createSpeakerEmbedding(audioSamples, sampleRate);
  const profile: SpeakerProfile = {
    type,
    embedding: Array.from(embedding),
    enrolledAt: new Date().toISOString(),
  };
  await saveProfile(profile);
  return profile;
}

// ── Classification ──

/**
 * Classify a speech segment as teacher or kids by comparing its embedding
 * with the enrolled reference profiles.
 */
export function classifySpeaker(
  segmentSamples: Float32Array,
  sampleRate: number,
  profiles: SpeakerProfile[],
): { speaker: SpeakerType; confidence: number; scores: Record<SpeakerType, number> } {
  const segEmbedding = createSpeakerEmbedding(segmentSamples, sampleRate);

  const scores: Record<string, number> = {};
  let bestType: SpeakerType = "teacher";
  let bestScore = -Infinity;

  for (const profile of profiles) {
    const refEmbedding = new Float32Array(profile.embedding);
    const sim = cosineSimilarity(segEmbedding, refEmbedding);
    scores[profile.type] = sim;

    if (sim > bestScore) {
      bestScore = sim;
      bestType = profile.type;
    }
  }

  return {
    speaker: bestType,
    confidence: Math.max(0, Math.min(1, (bestScore + 1) / 2)), // normalize to [0,1]
    scores: scores as Record<SpeakerType, number>,
  };
}

// ── Full Diarization Pipeline ──

export interface DiarSegment {
  start: number;
  end: number;
  speaker: SpeakerType;
  confidence: number;
}

/**
 * Run full speaker diarization on an audio buffer.
 * 
 * Pipeline:
 *  1. VAD (energy-based) → find speech regions
 *  2. For each region, extract MFCC embedding
 *  3. Compare with enrolled profiles → classify speaker
 */
export function diarize(
  audioData: Float32Array,
  sampleRate: number,
  profiles: SpeakerProfile[],
  onProgress?: (msg: string) => void,
): DiarSegment[] {
  onProgress?.("المرحلة 1/4: كشف مناطق الكلام (VAD)...");
  
  // ── Step 1: Energy-based VAD ──
  const hopSize = Math.floor(sampleRate * 0.01); // 10ms
  const windowSize = Math.floor(sampleRate * 0.03); // 30ms
  const energies: number[] = [];
  
  for (let i = 0; i < audioData.length - windowSize; i += hopSize) {
    let sum = 0;
    for (let j = 0; j < windowSize; j++) {
      sum += audioData[i + j] * audioData[i + j];
    }
    energies.push(Math.sqrt(sum / windowSize));
  }

  // Smooth energies
  const smoothRadius = 15;
  const smoothed: number[] = [];
  for (let i = 0; i < energies.length; i++) {
    let s = 0, c = 0;
    for (let j = Math.max(0, i - smoothRadius); j <= Math.min(energies.length - 1, i + smoothRadius); j++) {
      s += energies[j]; c++;
    }
    smoothed.push(s / c);
  }

  // Dynamic thresholds
  const sorted = [...smoothed].sort((a, b) => a - b);
  const noiseFloor = sorted[Math.floor(sorted.length * 0.05)];
  const signalPeak = sorted[Math.floor(sorted.length * 0.95)];
  const range = signalPeak - noiseFloor;
  const upperTh = noiseFloor + range * 0.12;
  const lowerTh = noiseFloor + range * 0.06;

  // Schmitt trigger segmentation
  let inSpeech = false;
  let startIdx = 0;
  let regions: { start: number; end: number }[] = [];

  for (let i = 0; i < smoothed.length; i++) {
    if (!inSpeech && smoothed[i] > upperTh) {
      inSpeech = true;
      startIdx = i;
    } else if (inSpeech && smoothed[i] < lowerTh) {
      inSpeech = false;
      regions.push({
        start: (startIdx * hopSize) / sampleRate,
        end: (i * hopSize) / sampleRate,
      });
    }
  }
  if (inSpeech) {
    regions.push({
      start: (startIdx * hopSize) / sampleRate,
      end: audioData.length / sampleRate,
    });
  }

  // Bridge short silences
  for (let i = 0; i < regions.length - 1; i++) {
    if (regions[i + 1].start - regions[i].end < 0.35) {
      regions[i].end = regions[i + 1].end;
      regions.splice(i + 1, 1);
      i--;
    }
  }

  // Filter noise
  regions = regions.filter(r => r.end - r.start > 0.3);

  onProgress?.(`المرحلة 2/4: تم كشف ${regions.length} منطقة كلام`);

  // ── Step 2+3: Extract embeddings and classify ──
  onProgress?.("المرحلة 3/4: استخراج بصمات الصوت وتصنيف المتحدثين...");
  
  const results: DiarSegment[] = [];

  for (let i = 0; i < regions.length; i++) {
    const r = regions[i];
    const startSample = Math.floor(r.start * sampleRate);
    const endSample = Math.min(Math.floor(r.end * sampleRate), audioData.length);
    const chunk = audioData.slice(startSample, endSample);

    if (chunk.length < sampleRate * 0.3) continue; // Skip very short segments

    const { speaker, confidence } = classifySpeaker(chunk, sampleRate, profiles);
    results.push({ start: r.start, end: r.end, speaker, confidence });
  }

  onProgress?.("المرحلة 4/4: التحقق والتصحيح...");

  // ── Step 4: Post-processing — smooth out isolated misclassifications ──
  // If a single segment is different from its neighbors, flip it
  for (let i = 1; i < results.length - 1; i++) {
    if (
      results[i].speaker !== results[i - 1].speaker &&
      results[i].speaker !== results[i + 1].speaker &&
      results[i].confidence < 0.65
    ) {
      results[i].speaker = results[i - 1].speaker;
    }
  }

  onProgress?.(`تم: ${results.length} مقطع مصنّف بنجاح!`);
  return results;
}

/**
 * Decode audio from a URL into raw samples at 16kHz mono.
 */
export async function decodeAudioFromUrl(url: string): Promise<{ samples: Float32Array; sampleRate: number }> {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
  const audio = await ctx.decodeAudioData(buf);
  const samples = audio.getChannelData(0);
  const sr = audio.sampleRate;
  ctx.close();
  return { samples, sampleRate: sr };
}
