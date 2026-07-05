import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from services.llm_client import llm_client

router = APIRouter()

class ResponseItem(BaseModel):
    category: str
    text: str
    transcript: str
    accuracyScore: int
    clarityScore: int
    completenessScore: int
    communicationScore: int

class ReportRequest(BaseModel):
    responses: List[ResponseItem]

@router.post("/generate")
async def generate_report(request: ReportRequest):
    if not request.responses:
        raise HTTPException(status_code=400, detail="Responses list cannot be empty")
        
    # Format responses summary for prompt
    summary_parts = []
    for idx, r in enumerate(request.responses):
        summary_parts.append(
            f"Question {idx+1} [{r.category}]: {r.text}\n"
            f"Candidate Answer: {r.transcript}\n"
            f"Scores - Accuracy: {r.accuracyScore}, Clarity: {r.clarityScore}, "
            f"Completeness: {r.completenessScore}, Communication: {r.communicationScore}\n"
        )
    responses_summary = "\n".join(summary_parts)
    
    prompt_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts", "report.txt")
    if os.path.exists(prompt_path):
        with open(prompt_path, "r", encoding="utf-8") as pf:
            prompt_template = pf.read()
    else:
        prompt_template = "Analyze the answers and scores to generate a report. Responses:\n{responses_summary}"
        
    prompt = prompt_template.format(responses_summary=responses_summary)
    
    try:
        response = llm_client.generate_json(
            prompt=prompt,
            system_instruction="You are an expert talent analyst. You output a placement readiness report in strict JSON format."
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
