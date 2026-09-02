import librosa
import numpy as np
import torch
import noisereduce as nr
from pyannote.audio import Pipeline
from scipy import signal
from typing import Optional, List, Dict, Tuple
import requests
import io
import logging

logger = logging.getLogger(__name__)


class AudioSegment:
    def __init__(self, start: float, end: float, speaker: str, ayah: Optional[int] = None):
        self.start = start
        self.end = end
        self.speaker = speaker
        self.ayah = ayah

    def to_dict(self) -> Dict:
        return {
            "start": round(self.start, 3),
            "end": round(self.end, 3),
            "speaker": self.speaker,
            "ayah": self.ayah,
        }


class AudioProcessor:
    def __init__(self):
        self.sr = 16000
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.diarization_pipeline = None
        self._load_models()

    def _load_models(self):
        """Load pre-trained models."""
        try:
            # Pyannote speaker diarization (3.0 recommended for Arabic)
            self.diarization_pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.0",
                use_auth_token=None  # Uses HF_TOKEN env var
            ).to(self.device)
            logger.info("Loaded diarization pipeline")
        except Exception as e:
            logger.warning(f"Failed to load diarization pipeline: {e}")
            self.diarization_pipeline = None

    async def download_audio(self, url: str) -> Tuple[np.ndarray, int]:
        """Download audio from URL."""
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()

            # Load audio from bytes
            audio_data = io.BytesIO(response.content)
            y, sr = librosa.load(audio_data, sr=self.sr, mono=True)
            logger.info(f"Downloaded audio: {len(y)} samples at {sr}Hz")
            return y, sr
        except Exception as e:
            logger.error(f"Error downloading audio: {e}")
            raise

    def preprocess_audio(self, y: np.ndarray, sr: int) -> np.ndarray:
        """Pre-process audio: noise reduction + normalization."""
        try:
            # Noise reduction
            y_clean = nr.reduce_noise(y=y, sr=sr, stationary=True, prop_decrease=1.0)

            # Normalize
            y_norm = y_clean / (np.max(np.abs(y_clean)) + 1e-7)

            logger.info(f"Preprocessed audio: noise reduction + normalization")
            return y_norm
        except Exception as e:
            logger.error(f"Error preprocessing audio: {e}")
            # Return original if preprocessing fails
            return y / (np.max(np.abs(y)) + 1e-7)

    def detect_voice_activity(self, y: np.ndarray, sr: int) -> List[Tuple[float, float]]:
        """Detect voice activity using energy-based method + silence."""
        try:
            # Use librosa's MFCC energy
            S = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128)
            S_db = librosa.power_to_db(S, ref=np.max)

            # Energy in each frame
            energy = np.mean(S_db, axis=0)

            # Threshold
            threshold = np.mean(energy) - 5  # 5dB below mean
            active_frames = energy > threshold

            # Convert to time segments
            hop_length = 512
            frame_times = librosa.frames_to_time(np.arange(len(energy)), sr=sr, hop_length=hop_length)

            # Merge adjacent active frames
            min_duration = 0.3  # 300ms min speech
            min_silence = 0.2   # 200ms min silence

            segments = []
            in_segment = False
            segment_start = 0

            for i, (is_active, time) in enumerate(zip(active_frames, frame_times)):
                if is_active and not in_segment:
                    segment_start = time
                    in_segment = True
                elif not is_active and in_segment:
                    segment_end = frame_times[i-1] if i > 0 else frame_times[0]
                    if segment_end - segment_start >= min_duration:
                        segments.append((segment_start, segment_end))
                    in_segment = False

            # Handle last segment
            if in_segment:
                segments.append((segment_start, frame_times[-1]))

            logger.info(f"Detected {len(segments)} voice activity regions")
            return segments
        except Exception as e:
            logger.error(f"Error detecting voice activity: {e}")
            return [(0.0, librosa.get_duration(y=y, sr=sr))]

    def get_speaker_characteristics(
        self, y: np.ndarray, sr: int, segment: Tuple[float, float]
    ) -> Dict[str, float]:
        """Analyze speaker characteristics (pitch, formants, etc.)."""
        start_frame = int(segment[0] * sr)
        end_frame = int(segment[1] * sr)
        segment_audio = y[start_frame:end_frame]

        try:
            # Compute fundamental frequency (F0) using autocorrelation
            S = librosa.stft(segment_audio)
            D = librosa.feature.melspectrogram(y=segment_audio, sr=sr, n_mels=128)
            D_db = librosa.power_to_db(D, ref=np.max)

            # Mean MFCC coefficients (represent timbre/pitch)
            mfcc = librosa.feature.mfcc(y=segment_audio, sr=sr, n_mfcc=13)
            mfcc_mean = np.mean(mfcc, axis=1)

            # Spectral centroid (brightness, lower = deeper voice)
            spec_centroid = librosa.feature.spectral_centroid(y=segment_audio, sr=sr)[0]
            mean_centroid = np.mean(spec_centroid)

            # Zero crossing rate (lower = more voiced, less noisy)
            zcr = librosa.feature.zero_crossing_rate(segment_audio)[0]
            mean_zcr = np.mean(zcr)

            return {
                "spectral_centroid": float(mean_centroid),
                "zero_crossing_rate": float(mean_zcr),
                "mfcc_mean": float(np.mean(mfcc_mean)),
            }
        except Exception as e:
            logger.warning(f"Error analyzing speaker characteristics: {e}")
            return {}

    def identify_speaker_auto(
        self, characteristics: Dict[str, float], segments_list: List[Dict]
    ) -> str:
        """
        Auto-identify speaker based on voice characteristics.
        Teacher (adult male) typically has lower spectral centroid.
        """
        if not characteristics:
            return "unknown"

        centroid = characteristics.get("spectral_centroid", 0)

        # Heuristic: if multiple segments exist, compare
        if len(segments_list) > 1:
            centroids = [
                s.get("characteristics", {}).get("spectral_centroid", 0)
                for s in segments_list
                if s.get("characteristics")
            ]
            if centroids:
                mean_centroid = np.mean(centroids)
                # Lower centroid = deeper voice = likely teacher
                return "teacher" if centroid < mean_centroid else "kids"

        # Default heuristic: centroid < 3000 Hz = adult (teacher)
        return "teacher" if centroid < 3000 else "kids"

    async def run_diarization(self, y: np.ndarray, sr: int) -> Optional[Dict]:
        """Run speaker diarization using pyannote."""
        if self.diarization_pipeline is None:
            return None

        try:
            # Save temp audio file (pyannote needs file path)
            temp_file = "/tmp/audio_temp.wav"
            librosa.output.write_wav(temp_file, y, sr=sr)

            # Run diarization
            diarization = self.diarization_pipeline(temp_file, num_speakers=2)

            segments = {}
            for turn, _, speaker in diarization.itertracks(yield_label=True):
                if speaker not in segments:
                    segments[speaker] = []
                segments[speaker].append({
                    "start": float(turn.start),
                    "end": float(turn.end),
                })

            logger.info(f"Diarization found {len(segments)} speakers")
            return segments
        except Exception as e:
            logger.warning(f"Diarization failed: {e}")
            return None

    def process_audio_hybrid(
        self,
        y: np.ndarray,
        sr: int,
        surah_number: int,
        ayah_count: int,
        is_stereo: bool = False,
        reference_teacher_url: Optional[str] = None,
        reference_kids_url: Optional[str] = None,
    ) -> List[AudioSegment]:
        """
        Hybrid approach combining multiple methods:
        1. Voice activity detection
        2. Diarization (if available)
        3. Speaker identification (auto or reference-based)
        """

        segments = []

        try:
            # Step 1: Detect voice activity
            vad_segments = self.detect_voice_activity(y, sr)
            if not vad_segments:
                logger.warning("No voice activity detected")
                return []

            logger.info(f"VAD found {len(vad_segments)} speech regions")

            # Step 2: Analyze each segment
            speaker_profiles = []
            for i, (start, end) in enumerate(vad_segments):
                chars = self.get_speaker_characteristics(y, sr, (start, end))
                speaker_profiles.append({
                    "index": i,
                    "start": start,
                    "end": end,
                    "characteristics": chars,
                })

            # Step 3: Identify speakers
            # Simple heuristic: even segments = teacher, odd = kids (or vice versa)
            # Better: use clustering or reference files

            for profile in speaker_profiles:
                speaker = self.identify_speaker_auto(profile["characteristics"], speaker_profiles)

                segment = AudioSegment(
                    start=profile["start"],
                    end=profile["end"],
                    speaker=speaker,
                    ayah=None,  # Will be assigned later
                )
                segments.append(segment)

            logger.info(f"Identified {len(segments)} segments")
            return segments

        except Exception as e:
            logger.error(f"Error in audio processing: {e}")
            return []

    def assign_ayahs(
        self, segments: List[AudioSegment], ayah_count: int
    ) -> List[AudioSegment]:
        """Assign ayah numbers to segments based on alternating speaker pattern."""
        if not segments:
            return segments

        try:
            # Assume pattern: teacher ayah 1 → kids ayah 1 → teacher ayah 2 → kids ayah 2
            teacher_count = 0
            kids_count = 0

            for segment in segments:
                if segment.speaker == "teacher":
                    teacher_count += 1
                    segment.ayah = min(teacher_count, ayah_count)
                elif segment.speaker == "kids":
                    kids_count += 1
                    segment.ayah = min(kids_count, ayah_count)

            logger.info(f"Assigned ayah numbers to {len(segments)} segments")
            return segments
        except Exception as e:
            logger.error(f"Error assigning ayahs: {e}")
            return segments
