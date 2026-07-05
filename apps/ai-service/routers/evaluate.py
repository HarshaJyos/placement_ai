import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.llm_client import llm_client

router = APIRouter()

class EvaluateRequest(BaseModel):
    questionText: str
    transcript: str
    category: str

@router.post("")
async def evaluate_response(request: EvaluateRequest):
    if not request.questionText or not request.transcript or not request.category:
        raise HTTPException(status_code=400, detail="questionText, transcript, and category are required")
        
    prompt_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts", "evaluation.txt")
    if os.path.exists(prompt_path):
        with open(prompt_path, "r", encoding="utf-8") as pf:
            prompt_template = pf.read()
    else:
        prompt_template = (
            "Evaluate response. Question: {questionText}\n"
            "Answer: {transcript}\nCategory: {category}"
        )
        
    prompt = prompt_template.format(
        questionText=request.questionText,
        transcript=request.transcript,
        category=request.category
    )
    
    try:
        response = llm_client.generate_json(
            prompt=prompt,
            system_instruction="You are an expert interviewer evaluating a response. You output strict JSON evaluation details."
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
