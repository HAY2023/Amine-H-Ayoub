from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import logging
import time
import asyncio

from pipeline import AudioProcessor, AudioSegment

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Quran Audio Segmentation API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global processor instance
processor = None


@app.on_event("startup")
async def startup_event():
    global processor
    logger.info("Initializing AudioProcessor...")
    processor = AudioProcessor()
    logger.info("AudioProcessor ready!")


# Request/Response models
class ProcessAudioRequest(BaseModel):
    audioUrl: str
    surahNumber: int
    ayahCount: int
    sessionId: Optional[str] = None
    referenceTeacher: Optional[str] = None
    referenceKids: Optional[str] = None
    isStereo: Optional[bool] = False


class AudioSegmentResponse(BaseModel):
    start: float
    end: float
    speaker: str
    ayah: Optional[int]


class ProcessAudioResponse(BaseModel):
    sessionId: Optional[str]
    segments: List[AudioSegmentResponse]
    duration: float
    processingTimeMs: int
    status: str = "completed"


class HealthResponse(BaseModel):
    status: str
    device: str


# Endpoints
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        device="cuda" if processor and processor.device == "cuda" else "cpu"
    )


@app.post("/process-audio", response_model=ProcessAudioResponse)
async def process_audio(request: ProcessAudioRequest):
    """
    Main endpoint: Process audio file and segment it.

    Args:
        audioUrl: URL to audio file in Supabase Storage
        surahNumber: Surah number (1-114)
        ayahCount: Number of ayahs in the surah
        sessionId: Optional session ID for tracking
        referenceTeacher: Optional URL to teacher reference audio
        referenceKids: Optional URL to kids reference audio
        isStereo: Whether audio is stereo (left=teacher, right=kids)

    Returns:
        Segments with timestamps and speaker identification
    """
    if not processor:
        raise HTTPException(status_code=500, detail="Processor not initialized")

    if not request.audioUrl:
        raise HTTPException(status_code=400, detail="audioUrl is required")

    start_time = time.time()

    try:
        logger.info(f"Processing audio: {request.audioUrl}")

        # Download audio
        y, sr = await processor.download_audio(request.audioUrl)
        duration = len(y) / sr
        logger.info(f"Audio loaded: {duration:.1f}s at {sr}Hz")

        # Pre-process
        y_clean = processor.preprocess_audio(y, sr)

        # Process
        segments = processor.process_audio_hybrid(
            y=y_clean,
            sr=sr,
            surah_number=request.surahNumber,
            ayah_count=request.ayahCount,
            is_stereo=request.isStereo,
            reference_teacher_url=request.referenceTeacher,
            reference_kids_url=request.referenceKids,
        )

        # Assign ayah numbers
        segments = processor.assign_ayahs(segments, request.ayahCount)

        # Convert to response
        segment_responses = [seg.to_dict() for seg in segments]

        processing_time = int((time.time() - start_time) * 1000)

        logger.info(
            f"✅ Completed: {len(segments)} segments in {processing_time}ms"
        )

        return ProcessAudioResponse(
            sessionId=request.sessionId,
            segments=[AudioSegmentResponse(**seg) for seg in segment_responses],
            duration=duration,
            processingTimeMs=processing_time,
            status="completed",
        )

    except Exception as e:
        logger.error(f"❌ Error processing audio: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/identify-speaker")
async def identify_speaker(
    audioUrl: str,
    referenceUrl: str,
    referenceType: str = "teacher",  # "teacher" or "kids"
):
    """
    Helper endpoint: Compare audio segment with reference to identify speaker.

    Args:
        audioUrl: URL to audio segment
        referenceUrl: URL to reference audio
        referenceType: Expected speaker type

    Returns:
        Similarity score (0.0-1.0) and identified speaker
    """
    if not processor:
        raise HTTPException(status_code=500, detail="Processor not initialized")

    try:
        # For now, return placeholder
        # TODO: Implement with resemblyzer embeddings
        return {
            "similarity": 0.85,
            "speaker": referenceType,
            "confidence": "high",
        }
    except Exception as e:
        logger.error(f"Error identifying speaker: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "Quran Audio Segmentation API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "process_audio": "/process-audio",
            "identify_speaker": "/identify-speaker",
        },
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
