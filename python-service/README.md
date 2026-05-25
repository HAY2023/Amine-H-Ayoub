# Quran Audio Segmentation API

Python FastAPI microservice for automatic Quranic audio segmentation using advanced speech processing techniques.

## Features

- 🎙️ **Voice Activity Detection** - Detect speech regions using energy-based VAD
- 👥 **Speaker Diarization** - Identify speaker changes using pyannote
- 🔊 **Speaker Identification** - Auto-detect teacher vs kids voices
- 🎵 **Audio Processing** - Noise reduction, normalization, preprocessing
- 📊 **Ayah Assignment** - Automatic ayah number assignment
- 🔄 **Flexible Inputs** - Support for mono/stereo audio files
- 📋 **Reference Support** - Optional teacher/kids reference files for comparison

## Installation

### Local Development

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Run development server
python main.py
```

Server will be available at `http://localhost:8000`

### Docker

```bash
# Build image
docker build -t quran-audio-api .

# Run container
docker run --gpus all -p 8000:8000 \
  -e HF_TOKEN=your_token_here \
  quran-audio-api
```

## API Endpoints

### Health Check
```bash
GET /health

# Response
{
  "status": "healthy",
  "device": "cuda"
}
```

### Process Audio
```bash
POST /process-audio

# Request
{
  "audioUrl": "https://storage.url/audio.mp3",
  "surahNumber": 1,
  "ayahCount": 7,
  "sessionId": "abc123",
  "referenceTeacher": "https://storage.url/teacher_ref.wav",
  "referenceKids": "https://storage.url/kids_ref.wav",
  "isStereo": false
}

# Response
{
  "sessionId": "abc123",
  "segments": [
    {
      "start": 0.0,
      "end": 5.2,
      "speaker": "teacher",
      "ayah": 1
    },
    {
      "start": 5.3,
      "end": 8.1,
      "speaker": "kids",
      "ayah": 1
    }
  ],
  "duration": 120.5,
  "processingTimeMs": 45000,
  "status": "completed"
}
```

### Identify Speaker
```bash
POST /identify-speaker?audioUrl=...&referenceUrl=...&referenceType=teacher

# Response
{
  "similarity": 0.92,
  "speaker": "teacher",
  "confidence": "high"
}
```

## Architecture

```
Input Audio (MP3/WAV)
    ↓
Pre-processing (Noise Reduction + Normalization)
    ↓
Voice Activity Detection (Energy-based VAD)
    ↓
Speaker Characteristics Analysis (Spectral Centroid, MFCC)
    ↓
Speaker Diarization (pyannote)
    ↓
Speaker Identification (Auto or Reference-based)
    ↓
Ayah Assignment (Based on alternating pattern)
    ↓
Output: Segments with timestamps
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SAMPLE_RATE` | 16000 | Audio sample rate in Hz |
| `DEVICE` | cuda | Compute device (cuda/cpu) |
| `LOG_LEVEL` | INFO | Logging level |
| `HF_TOKEN` | - | Hugging Face API token |
| `VAD_THRESHOLD` | 0.5 | Voice activity threshold |
| `MIN_SPEECH_DURATION_MS` | 300 | Minimum speech segment duration |
| `MIN_SILENCE_DURATION_MS` | 200 | Minimum silence duration |
| `SPECTRAL_CENTROID_THRESHOLD` | 3000 | Hz threshold for speaker identification |

## Models Used

- **Diarization**: `pyannote/speaker-diarization-3.0`
- **Voice Activity**: Energy-based + librosa features
- **Speaker Identification**: resemblyzer + spectral analysis

## Development

### Structure
```
python-service/
├── main.py              # FastAPI app + endpoints
├── pipeline.py          # Audio processing pipeline
├── requirements.txt     # Python dependencies
├── Dockerfile          # Container configuration
└── .env.example        # Environment template
```

### Testing

```bash
# Test health endpoint
curl http://localhost:8000/health

# Test audio processing
curl -X POST http://localhost:8000/process-audio \
  -H "Content-Type: application/json" \
  -d '{
    "audioUrl": "https://...",
    "surahNumber": 1,
    "ayahCount": 7
  }'
```

## Performance Notes

- **GPU Acceleration**: Requires NVIDIA GPU with CUDA support
- **Processing Time**: ~30-60s for typical 2-3 minute audio file
- **Memory**: ~2GB RAM + 4GB GPU VRAM for optimal performance
- **Dependencies**: Large models (pyannote ~500MB, torch ~2GB)

## Deployment

### Modal (Recommended)
```bash
pip install modal
modal deploy main.py
```

### Railway
```bash
railway link
railway up
```

### Fly.io
```bash
flyctl launch
flyctl deploy
```

## Troubleshooting

### CUDA not found
```bash
# Install CUDA 11.8
# Or use CPU: export DEVICE=cpu
```

### Out of Memory
```bash
# Reduce batch size or use CPU
# Monitor with: nvidia-smi
```

### Model download timeout
```bash
# Pre-download models:
python -c "from pyannote.audio import Pipeline; Pipeline.from_pretrained('pyannote/speaker-diarization-3.0')"
```

## License

MIT
