import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load env
load_dotenv()

app = FastAPI(title="AI Placement Interview Service", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routers
from routers import resume, github, questions, evaluate, transcribe, report

app.include_router(resume.router, prefix="/resume", tags=["Resume"])
app.include_router(github.router, prefix="/github", tags=["Github"])
app.include_router(questions.router, prefix="/questions", tags=["Questions"])
app.include_router(transcribe.router, prefix="/transcribe", tags=["Transcribe"])
app.include_router(evaluate.router, prefix="/evaluate", tags=["Evaluate"])
app.include_router(report.router, prefix="/report", tags=["Report"])

@app.get("/")
def read_root():
    return {"status": "online", "message": "AI Placement Interview API is running"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
