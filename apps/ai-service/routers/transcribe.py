from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.whisper_client import whisper_client
import os

import httpx

router = APIRouter()

class TranscribeRequest(BaseModel):
    audioUrl: str

@router.post("")
async def transcribe_audio(request: TranscribeRequest):
    if not request.audioUrl:
        raise HTTPException(status_code=400, detail="audioUrl is required")
        
    audio_path = request.audioUrl
    is_temp_file = False
    
    # Handle remote URL if it starts with http
    if audio_path.startswith("http://") or audio_path.startswith("https://"):
        try:
            # Download file to a local temporary path
            async with httpx.AsyncClient() as client:
                res = await client.get(audio_path)
                if res.status_code != 200:
                    raise HTTPException(status_code=400, detail="Failed to download audio file from URL")
                
                temp_filename = f"temp_audio_{os.urandom(8).hex()}.webm"
                temp_dir = os.path.join(os.getcwd(), "temp")
                os.makedirs(temp_dir, exist_ok=True)
                audio_path = os.path.join(temp_dir, temp_filename)
                
                with open(audio_path, "wb") as f:
                    f.write(res.content)
                is_temp_file = True
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch remote audio file: {str(e)}")

    try:
        # Check if local file path exists
        if not os.path.exists(audio_path):
            raise HTTPException(status_code=404, detail=f"Audio file not found at path: {audio_path}")
            
        transcript = whisper_client.transcribe(audio_path)
        return {"transcript": transcript}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean up temporary file if downloaded
        if is_temp_file and os.path.exists(audio_path):
            try:
                os.remove(audio_path)
            except Exception:
                pass
