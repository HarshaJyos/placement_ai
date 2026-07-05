import os
import json
import google.generativeai as genai
from typing import Dict, Any

class GeminiClient:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            # Using gemini-1.5-flash as the default fast and highly capable model
            self.model_name = "gemini-1.5-flash"
            self.has_key = True
        else:
            self.has_key = False
            print("WARNING: GEMINI_API_KEY not found in environment. Running in Mock mode.")

    def generate_json(self, prompt: str, system_instruction: str = None) -> Dict[str, Any]:
        if not self.has_key:
            # Fallback mock response generator based on request patterns
            return self._generate_mock_response(prompt)
            
        try:
            model = genai.GenerativeModel(
                model_name=self.model_name,
                system_instruction=system_instruction
            )
            
            # Request JSON output from Gemini
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            
            return json.loads(response.text)
        except Exception as e:
            print(f"Gemini API Error: {e}. Retrying once...")
            try:
                # Retry once on failure
                model = genai.GenerativeModel(model_name=self.model_name, system_instruction=system_instruction)
                response = model.generate_content(
                    prompt,
                    generation_config={"response_mime_type": "application/json"}
                )
                return json.loads(response.text)
            except Exception as retry_err:
                print(f"Gemini Retry Error: {retry_err}. Falling back to mock data.")
                return self._generate_mock_response(prompt)

    def _generate_mock_response(self, prompt: str) -> Dict[str, Any]:
        """Provides realistic mock data if Gemini API is missing or fails."""
        prompt_lower = prompt.lower()
        
        # 1. Mock Resume Extraction
        if "extract" in prompt_lower or "resume" in prompt_lower:
            return {
                "skills": ["JavaScript", "React", "Node.js", "Python", "SQL", "Git"],
                "projects": [
                    {
                        "name": "E-Commerce Backend",
                        "description": "RESTful API built with Express and PostgreSQL",
                        "tech_used": "Node.js, Express, PostgreSQL"
                    },
                    {
                        "name": "Portfolio Website",
                        "description": "Personal developer portfolio built with Next.js",
                        "tech_used": "React, Next.js, Tailwind CSS"
                    }
                ],
                "education": "B.Tech in Computer Science, Grad Year: 2026",
                "experience": "Software Engineering Intern at TechCorp (3 months)",
                "score": 78,
                "suggestions": [
                    "Add more details about quantitative project achievements",
                    "Include links to live projects or demo videos",
                    "Expand on cloud technologies if any were used"
                ]
            }
            
        # 2. Mock Question Generation
        elif "questions" in prompt_lower or "interview" in prompt_lower:
            return {
                "questions": [
                    {"category": "PROJECT", "text": "Can you explain the architecture of your E-Commerce Backend project?"},
                    {"category": "PROJECT", "text": "How did you design the database schema for handling items and orders in PostgreSQL?"},
                    {"category": "PROJECT", "text": "Why did you choose React and Next.js for your Portfolio website instead of simple HTML/CSS?"},
                    {"category": "TECHNICAL", "text": "What is the difference between client-side rendering (CSR) and server-side rendering (SSR) in Next.js?"},
                    {"category": "TECHNICAL", "text": "How do you optimize slow query times in a database like PostgreSQL?"},
                    {"category": "TECHNICAL", "text": "Explain how async/await works under the hood in Node.js/JavaScript."},
                    {"category": "HR", "text": "Tell me about a time you faced a difficult technical challenge in a project. How did you resolve it?"},
                    {"category": "HR", "text": "Why are you interested in this preferred role, and what makes you a good fit?"},
                    {"category": "HR", "text": "How do you prioritize tasks when you have multiple deadlines coming up?"}
                ]
            }
            
        # 3. Mock Response Evaluation
        elif "evaluate" in prompt_lower or "answer" in prompt_lower:
            return {
                "accuracy": 80,
                "clarity": 85,
                "completeness": 75,
                "communication": 90,
                "feedback": "Great overview of the technology choice. To improve, discuss specific performance differences, such as First Contentful Paint times and SEO advantages of SSR."
            }
            
        # 4. Mock Report Generation
        else:
            return {
                "overallScore": 82,
                "technicalScore": 80,
                "communicationScore": 88,
                "projectScore": 84,
                "hrScore": 76,
                "strengths": ["Strong explanation of Next.js concepts", "Clear structural descriptions", "Professional vocabulary"],
                "weaknesses": ["Missed deep database queries optimization", "Slightly short behavioral answers"],
                "suggestions": ["Elaborate on performance testing stats", "Use STAR method more strictly for HR questions"]
            }

llm_client = GeminiClient()
