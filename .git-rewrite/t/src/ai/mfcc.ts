/**
 * MFCC Feature Extraction — Pure JavaScript (No external dependencies)
 * 
 * Mel-Frequency Cepstral Coefficients هي البصمة الصوتية الأساسية
 * المستخدمة في التعرف على المتحدثين. تميز بين صوت الرجل (المعلم)
 * وصوت الأطفال بدقة عالية لأن الترددات الأساسية مختلفة جداً.
 */

// ── Mel Filterbank ──

const hzToMel = (hz: number): number => 2595 * Math.log10(1 + hz / 700);
const melToHz = (mel: number): number => 700 * (Math.pow(10, mel / 2595) - 1);

function createMelFilterbank(
  numFilters: number,
  fftSize: number,
  sampleRate: number,
  lowFreq = 80,
  highFreq?: number,
): Float32Array[] {
  const nyquist = sampleRate / 2;
  const high = highFreq ?? nyquist;
  const lowMel = hzToMel(lowFreq);
  const highMel = hzToMel(high);

  // Create evenly spaced mel points
  const melPoints: number[] = [];
  for (let i = 0; i <= numFilters + 1; i++) {
    melPoints.push(lowMel + (i * (highMel - lowMel)) / (numFilters + 1));
  }

  // Convert mel points to FFT bin indices
  const binPoints = melPoints.map(
    (mel) => Math.floor(((fftSize + 1) * melToHz(mel)) / sampleRate)
  );

  const filterbank: Float32Array[] = [];
  const numBins = Math.floor(fftSize / 2) + 1;

  for (let m = 1; m <= numFilters; m++) {
    const filter = new Float32Array(numBins);
    for (let k = 0; k < numBins; k++) {
      if (k < binPoints[m - 1]) {
        filter[k] = 0;
      } else if (k <= binPoints[m]) {
        filter[k] =
          (k - binPoints[m - 1]) / (binPoints[m] - binPoints[m - 1] + 1e-10);
      } else if (k <= binPoints[m + 1]) {
        filter[k] =
          (binPoints[m + 1] - k) / (binPoints[m + 1] - binPoints[m] + 1e-10);
      } else {
        filter[k] = 0;
      }
    }
    filterbank.push(filter);
  }

  return filterbank;
}

// ── FFT (Cooley-Tukey) ──

function fft(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  if (n <= 1) return;

  // Bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let curRe = 1,
        curIm = 0;
      for (let j = 0; j < halfLen; j++) {
        const tRe = curRe * re[i + j + halfLen] - curIm * im[i + j + halfLen];
        const tIm = curRe * im[i + j + halfLen] + curIm * re[i + j + halfLen];
        re[i + j + halfLen] = re[i + j] - tRe;
        im[i + j + halfLen] = im[i + j] - tIm;
        re[i + j] += tRe;
        im[i + j] += tIm;
        const newCurRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = newCurRe;
      }
    }
  }
}

// ── Power Spectrum ──

function powerSpectrum(frame: Float32Array, fftSize: number): Float32Array {
  const re = new Float32Array(fftSize);
  const im = new Float32Array(fftSize);

  // Apply Hamming window and copy
  for (let i = 0; i < frame.length; i++) {
    re[i] = frame[i] * (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (frame.length - 1)));
  }

  fft(re, im);

  const numBins = Math.floor(fftSize / 2) + 1;
  const power = new Float32Array(numBins);
  for (let i = 0; i < numBins; i++) {
    power[i] = (re[i] * re[i] + im[i] * im[i]) / fftSize;
  }
  return power;
}

// ── DCT Type-II ──

function dct(input: Float32Array, numCoeffs: number): Float32Array {
  const N = input.length;
  const output = new Float32Array(numCoeffs);
  for (let k = 0; k < numCoeffs; k++) {
    let sum = 0;
    for (let n = 0; n < N; n++) {
      sum += input[n] * Math.cos((Math.PI * k * (2 * n + 1)) / (2 * N));
    }
    output[k] = sum;
  }
  return output;
}

// ── Main MFCC Extraction ──

export interface MFCCConfig {
  sampleRate: number;
  numCoeffs?: number;      // default 13
  numFilters?: number;      // default 26
  frameLength?: number;     // default 0.025 (25ms)
  frameStep?: number;       // default 0.01 (10ms)
  fftSize?: number;         // default 512
  lowFreq?: number;         // default 80
  highFreq?: number;        // default sampleRate/2
}

/**
 * Extract MFCC features from raw audio samples.
 * Returns an array of MFCC vectors (one per frame).
 */
export function extractMFCC(
  samples: Float32Array,
  config: MFCCConfig,
): Float32Array[] {
  const {
    sampleRate,
    numCoeffs = 13,
    numFilters = 26,
    frameLength = 0.025,
    frameStep = 0.01,
    fftSize = 512,
    lowFreq = 80,
    highFreq,
  } = config;

  const frameSamples = Math.floor(frameLength * sampleRate);
  const stepSamples = Math.floor(frameStep * sampleRate);
  const filterbank = createMelFilterbank(numFilters, fftSize, sampleRate, lowFreq, highFreq);

  const frames: Float32Array[] = [];

  for (let offset = 0; offset + frameSamples <= samples.length; offset += stepSamples) {
    const frame = samples.slice(offset, offset + frameSamples);

    // Power spectrum
    const power = powerSpectrum(frame, fftSize);

    // Apply mel filterbank
    const melEnergies = new Float32Array(numFilters);
    for (let m = 0; m < numFilters; m++) {
      let sum = 0;
      for (let k = 0; k < power.length; k++) {
        sum += power[k] * filterbank[m][k];
      }
      melEnergies[m] = Math.log(sum + 1e-10); // Log mel energies
    }

    // DCT to get MFCCs
    const mfcc = dct(melEnergies, numCoeffs);
    frames.push(mfcc);
  }

  return frames;
}

/**
 * Compute the mean MFCC vector across all frames.
 * This is the "speaker embedding" — a single vector representing the voice.
 */
export function meanMFCC(frames: Float32Array[]): Float32Array {
  if (frames.length === 0) return new Float32Array(13);
  const dim = frames[0].length;
  const mean = new Float32Array(dim);
  for (const frame of frames) {
    for (let i = 0; i < dim; i++) {
      mean[i] += frame[i];
    }
  }
  for (let i = 0; i < dim; i++) {
    mean[i] /= frames.length;
  }
  return mean;
}

/**
 * Compute standard deviation of MFCC across frames.
 * Combined with mean, gives a richer speaker representation.
 */
export function stdMFCC(frames: Float32Array[], mean: Float32Array): Float32Array {
  if (frames.length <= 1) return new Float32Array(mean.length);
  const dim = mean.length;
  const variance = new Float32Array(dim);
  for (const frame of frames) {
    for (let i = 0; i < dim; i++) {
      const diff = frame[i] - mean[i];
      variance[i] += diff * diff;
    }
  }
  const std = new Float32Array(dim);
  for (let i = 0; i < dim; i++) {
    std[i] = Math.sqrt(variance[i] / frames.length);
  }
  return std;
}

/**
 * Create a full speaker embedding by concatenating mean + std of MFCCs.
 * This gives a 26-dimensional vector (13 mean + 13 std) that represents
 * a speaker's voice characteristics.
 */
export function createSpeakerEmbedding(samples: Float32Array, sampleRate: number): Float32Array {
  const frames = extractMFCC(samples, { sampleRate });
  const mean = meanMFCC(frames);
  const std = stdMFCC(frames, mean);
  
  // Concatenate mean + std for a richer representation
  const embedding = new Float32Array(mean.length + std.length);
  embedding.set(mean, 0);
  embedding.set(std, mean.length);
  return embedding;
}

/**
 * Cosine similarity between two vectors. Returns value in [-1, 1].
 * Higher = more similar voices.
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}
