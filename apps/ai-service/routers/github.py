from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.github_client import github_client

router = APIRouter()

class GithubAnalyzeRequest(BaseModel):
    username: str

@router.post("/analyze")
async def analyze_github(request: GithubAnalyzeRequest):
    if not request.username:
        raise HTTPException(status_code=400, detail="Username is required")
        
    # Clean the username in case they entered a full URL
    username = request.username.split("/")[-1].strip()
    
    try:
        analysis = await github_client.analyze_repositories(username)
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
