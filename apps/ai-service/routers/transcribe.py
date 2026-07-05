from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.whisper_client import whisper_client
import os

router = APIRouter()

class TranscribeRequest(BaseModel):
    audioUrl: str

@router.post("")
async def transcribe_audio(request: TranscribeRequest):
    if not request.audioUrl:
        raise HTTPException(status_code=400, detail="audioUrl is required")
        
    audio_path = request.audioUrl
    
    # Check if local file path exists
    if not os.path.exists(audio_path):
        # We can try to handle remote downloads here if it starts with http, but for MVP dev we pass absolute local paths from Next.js.
        raise HTTPException(status_code=404, detail=f"Audio file not found at path: {audio_path}")
        
    try:
        transcript = whisper_client.transcribe(audio_path)
        return {"transcript": transcript}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
