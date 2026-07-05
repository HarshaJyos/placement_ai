import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
from services.llm_client import llm_client

router = APIRouter()

class QuestionGenerateRequest(BaseModel):
    resumeJson: Optional[str] = "{}"
    githubSummary: Optional[str] = "[]"
    targetRole: str

@router.post("/generate")
async def generate_questions(request: QuestionGenerateRequest):
    if not request.targetRole:
        raise HTTPException(status_code=400, detail="Target role is required")
        
    prompt_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts", "question_gen.txt")
    if os.path.exists(prompt_path):
        with open(prompt_path, "r", encoding="utf-8") as pf:
            prompt_template = pf.read()
    else:
        prompt_template = (
            "Generate 15 interview questions for {targetRole}.\n"
            "Resume: {resumeJson}\nGitHub: {githubSummary}"
        )
        
    prompt = prompt_template.format(
        targetRole=request.targetRole,
        resumeJson=request.resumeJson,
        githubSummary=request.githubSummary
    )
    
    try:
        response = llm_client.generate_json(
            prompt=prompt,
            system_instruction="You are an expert interviewer. You output strict JSON containing a list of questions."
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
