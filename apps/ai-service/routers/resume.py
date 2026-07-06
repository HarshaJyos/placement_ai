import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pdfplumber
import httpx
from services.llm_client import llm_client

router = APIRouter()

class ResumeParseRequest(BaseModel):
    fileUrl: str

def extract_text_from_pdf(pdf_path: str) -> str:
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text

@router.post("/parse")
async def parse_resume(request: ResumeParseRequest):
    file_path = request.fileUrl
    is_temp_file = False
    
    # Handle remote URL if it starts with http
    if file_path.startswith("http://") or file_path.startswith("https://"):
        try:
            # Download file to a local temporary path
            async with httpx.AsyncClient() as client:
                res = await client.get(file_path)
                if res.status_code != 200:
                    raise HTTPException(status_code=400, detail=f"Failed to download resume file from URL: status {res.status_code}, body: {res.text[:200]}")
                
                temp_filename = f"temp_resume_{os.urandom(8).hex()}.pdf"
                temp_dir = os.path.join(os.getcwd(), "temp")
                os.makedirs(temp_dir, exist_ok=True)
                file_path = os.path.join(temp_dir, temp_filename)
                
                with open(file_path, "wb") as f:
                    f.write(res.content)
                is_temp_file = True
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch remote file: {str(e)}")
            
    try:
        # Check if local file exists
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"Resume file not found at path: {file_path}")
            
        # Extract text from PDF
        try:
            resume_text = extract_text_from_pdf(file_path)
        except Exception as pdf_err:
            raise HTTPException(status_code=400, detail=f"Failed to parse PDF file. Ensure it is a valid PDF: {str(pdf_err)}")
            
        if not resume_text.strip():
            raise HTTPException(status_code=400, detail="The resume PDF appears to be empty or contains unscannable image text.")

        # Read prompt template
        prompt_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts", "resume_extract.txt")
        if os.path.exists(prompt_path):
            with open(prompt_path, "r", encoding="utf-8") as pf:
                prompt_template = pf.read()
        else:
            prompt_template = "Extract the details from the resume text. Return a JSON structure. Resume Text:\n{resume_text}"

        prompt = prompt_template.format(resume_text=resume_text)
        
        # Call LLM client
        parsed_data = llm_client.generate_json(
            prompt=prompt,
            system_instruction="You are an expert resume parsing bot. You extract details into standard JSON format."
        )
        
        return parsed_data
        
    finally:
        # Clean up temporary file if downloaded
        if is_temp_file and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass
