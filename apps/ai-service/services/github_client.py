import os
import httpx
from typing import List, Dict, Any
from services.llm_client import llm_client

class GitHubClient:
    def __init__(self):
        self.token = os.getenv("GITHUB_TOKEN")
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "PlacementAI-Agent"
        }
        if self.token:
            self.headers["Authorization"] = f"token {self.token}"

    async def get_top_repositories(self, username: str, limit: int = 5) -> List[Dict[str, Any]]:
        url = f"https://api.github.com/users/{username}/repos"
        params = {
            "sort": "updated",
            "per_page": str(limit * 2)  # Get more to filter out forks
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=self.headers, params=params, timeout=10.0)
                if response.status_code == 404:
                    raise Exception(f"GitHub user '{username}' not found.")
                elif response.status_code != 200:
                    raise Exception(f"GitHub API Error (Status {response.status_code}): {response.text}")
                
                repos = response.json()
                # Filter out forks, prioritize repos with stars / description
                filtered_repos = [r for r in repos if not r.get("fork")]
                if not filtered_repos:
                    filtered_repos = repos
                
                return filtered_repos[:limit]
            except Exception as e:
                print(f"Error fetching repos for {username}: {e}")
                # Return empty list on failure so the process doesn't break
                return []

    async def get_repo_readme(self, username: str, repo_name: str) -> str:
        url = f"https://api.github.com/repos/{username}/{repo_name}/readme"
        headers = self.headers.copy()
        headers["Accept"] = "application/vnd.github.raw"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=headers, timeout=5.0)
                if response.status_code == 200:
                    # Limit README content size to prevent LLM token overflow
                    return response.text[:4000]
                return ""
            except Exception:
                return ""

    async def analyze_repositories(self, username: str) -> List[Dict[str, Any]]:
        repos = await self.get_top_repositories(username, limit=3)
        if not repos:
            return []
            
        analysis_results = []
        
        for repo in repos:
            repo_name = repo.get("name")
            description = repo.get("description") or "No description provided."
            language = repo.get("language") or "Unknown"
            readme_content = await self.get_repo_readme(username, repo_name)
            
            # Construct a prompt for Gemini to analyze this repo
            prompt = f"""
            Analyze the following GitHub repository and output a strict JSON structure containing details.
            
            Repository Name: {repo_name}
            Primary Language: {language}
            Description: {description}
            
            README Content (first 4000 chars):
            {readme_content}
            
            Required Output JSON structure:
            {{
              "repo": "{repo_name}",
              "languages": ["{language}", ...],
              "frameworks": ["react", "express", ...],
              "complexity": "LOW" | "MEDIUM" | "HIGH",
              "features": ["authentication", "database sync", "REST API", ...],
              "isLikelyTutorial": true | false
            }}
            
            Guidelines for fields:
            - isLikelyTutorial: set to true if the readme mentions it's a clone, tutorial, course exercise, or looks like standard boilerplate.
            - complexity: HIGH if it uses multi-tiered architecture, state management, complex integrations; MEDIUM for basic full-stack or CRUD; LOW for simple static pages or calculators.
            
            Return ONLY the valid JSON structure.
            """
            
            try:
                repo_analysis = llm_client.generate_json(
                    prompt=prompt,
                    system_instruction="You are a senior software architect analyzing developer portfolios."
                )
                
                # Make sure the repo name matches in the output
                repo_analysis["repo"] = repo_name
                analysis_results.append(repo_analysis)
            except Exception as e:
                print(f"Error analyzing repo {repo_name} with LLM: {e}")
                # Fallback to simple analysis if LLM fails
                analysis_results.append({
                    "repo": repo_name,
                    "languages": [language],
                    "frameworks": [],
                    "complexity": "MEDIUM",
                    "features": [description],
                    "isLikelyTutorial": False
                })
                
        return analysis_results

github_client = GitHubClient()
