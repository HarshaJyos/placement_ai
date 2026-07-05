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


import base64

class AnswerEvaluationItem(BaseModel):
    questionId: str
    category: str
    text: str
    audioPath: str

class InterviewEvaluationRequest(BaseModel):
    targetRole: str
    resumeJson: str
    githubSummary: str
    answers: List[AnswerEvaluationItem]

@router.post("/evaluate-interview")
async def evaluate_interview(request: InterviewEvaluationRequest):
    if not request.answers:
        raise HTTPException(status_code=400, detail="Answers list cannot be empty")
        
    prompt_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts", "interview_evaluation.txt")
    if os.path.exists(prompt_path):
        with open(prompt_path, "r", encoding="utf-8") as pf:
            prompt_template = pf.read()
    else:
        raise HTTPException(status_code=500, detail="interview_evaluation.txt prompt template not found")
        
    prompt = prompt_template.format(
        targetRole=request.targetRole,
        resumeJson=request.resumeJson,
        githubSummary=request.githubSummary
    )
    
    contents = [prompt]
    
    for idx, ans in enumerate(request.answers):
        audio_path = ans.audioPath
        if not os.path.exists(audio_path):
            print(f"Warning: Audio file not found at {audio_path}")
            continue
            
        try:
            with open(audio_path, "rb") as af:
                audio_bytes = af.read()
            
            # Simple mime type check based on extension
            mime_type = "audio/webm"
            if audio_path.endswith(".wav"):
                mime_type = "audio/wav"
            elif audio_path.endswith(".mp3"):
                mime_type = "audio/mp3"
                
            audio_part = {
                "mime_type": mime_type,
                "data": base64.b64encode(audio_bytes).decode("utf-8")
            }
            
            question_header = (
                f"\n--- Question {idx+1} ID: {ans.questionId} ---\n"
                f"Category: {ans.category}\n"
                f"Question Text: {ans.text}\n"
                f"Here is the spoken audio answer recorded by the candidate for Question {idx+1}:"
            )
            contents.append(question_header)
            contents.append(audio_part)
        except Exception as file_err:
            print(f"Error reading audio file {audio_path}: {file_err}")
            
    try:
        response = llm_client.generate_multimodal_json(
            contents=contents,
            system_instruction="You are a senior tech recruiter and talent consultant assessing an interview."
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

