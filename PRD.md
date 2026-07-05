# PRD — AI Placement Interview Platform (MVP)

## 0. How to use this document
This PRD is written to be handed directly to an AI coding agent (Claude Code, Cursor, etc.) as a build spec. It defines exact scope, schema, API contracts, and folder structure so the agent doesn't have to guess. Anything under "Phase 2+" is **out of scope for the build** — it exists only so the schema/architecture doesn't have to be redesigned later.

---

## 1. Product Summary
A web platform where a student registers, uploads a resume and GitHub profile, receives an AI-generated personalized interview (based on their resume + repos), answers by voice, gets the answers transcribed and scored by an LLM, and receives a PDF-style report with scores, strengths, weaknesses, and suggestions.

**Primary customer:** College placement cell (B2B2C — college pays, students use it).

## 2. MVP Scope (build this, nothing more)
1. Auth: student registration/login.
2. Resume upload + parsing into structured JSON.
3. GitHub URL input + repo analysis + summarization.
4. AI-generated question set (project, technical, HR) from resume + GitHub summary + target role.
5. Voice interview: one question at a time, mic recording per answer, no video.
6. Speech-to-text transcription of each answer.
7. LLM evaluation of each answer (accuracy, clarity, completeness, communication).
8. Final report: overall + per-category scores, strengths, weaknesses, suggestions.
9. Student dashboard: past interviews, latest report.
10. Minimal admin view: list of students + their overall scores (read-only, no fancy analytics).

**Explicitly NOT in MVP:** video recording, webcam, eye/face/emotion analysis, coding-question judge/compiler, AI avatar, company-specific interview modes, leaderboards, multilingual support. These are Phase 2/3 — see §10.

## 3. Tech Stack

| Layer | Choice |
|---|---|
| Frontend + App backend | Next.js 14+ (App Router), TypeScript, Tailwind CSS |
| App database | PostgreSQL (via Prisma ORM) |
| Auth | NextAuth.js (Credentials provider: email+password, bcrypt hashed) |
| File storage (resumes, audio) | Local disk in dev (`/storage`), swappable to S3-compatible bucket via a storage adapter interface |
| AI/ML microservice | Python 3.10, FastAPI — **only** for the parts that need Python's ML ecosystem |
| Speech-to-text | `openai-whisper` (local, Python) or Whisper API — decide by cost (see §9) |
| LLM (question gen + evaluation) | Anthropic Claude API (or OpenAI), called from the Python service |
| Resume parsing | Python (`pdfplumber` for text extraction + LLM for structuring) |
| GitHub data | GitHub REST API, called from Python service |
| Queue/background jobs | Simple in-process async in MVP (BullMQ/Redis is a Phase 2 upgrade if load requires it) |

**Why split Next.js + Python instead of pure Next.js:** Whisper, resume PDF parsing, and GitHub repo heuristics are far better supported in Python. Next.js owns all user-facing CRUD, auth, and UI; it calls the Python service over HTTP for anything AI-heavy. This keeps the Next.js app simple and keeps AI logic in one place that's easy to swap/upgrade later.

**Assumption made:** Since you didn't specify, I'm assuming email/password auth via NextAuth (not Firebase) to keep everything inside the Next.js/Postgres stack with no external auth dependency. Say so if you'd rather use Firebase Auth.

---

## 4. Repository Structure

```
placement-ai/
├── apps/
│   ├── web/                     # Next.js app (frontend + app backend)
│   │   ├── app/
│   │   │   ├── (auth)/login, register
│   │   │   ├── (dashboard)/dashboard, interview/[id], report/[id]
│   │   │   ├── (admin)/admin
│   │   │   └── api/              # Next.js route handlers (thin, call Python service)
│   │   ├── prisma/schema.prisma
│   │   ├── lib/ (db client, auth config, storage adapter, py-service client)
│   │   └── components/
│   └── ai-service/               # Python FastAPI microservice
│       ├── main.py
│       ├── routers/ (resume.py, github.py, questions.py, evaluate.py, transcribe.py)
│       ├── services/ (llm_client.py, whisper_client.py, github_client.py)
│       ├── requirements.txt
│       └── prompts/ (question_gen.txt, evaluation.txt, resume_extract.txt)
├── docker-compose.yml            # postgres + web + ai-service
└── .env.example
```

---

## 5. Database Schema (Prisma)

```prisma
model User {
  id            String   @id @default(cuid())
  fullName      String
  email         String   @unique
  passwordHash  String
  phone         String?
  college       String?
  degree        String?
  branch        String?
  gradYear      Int?
  githubUrl     String?
  linkedinUrl   String?
  preferredRole String?
  role          Role     @default(STUDENT)
  createdAt     DateTime @default(now())
  resumes       Resume[]
  interviews    Interview[]
}

enum Role {
  STUDENT
  ADMIN
}

model Resume {
  id           String   @id @default(cuid())
  userId       String
  fileUrl      String
  parsedJson   Json?     // structured extraction output
  score        Int?
  createdAt    DateTime @default(now())
  user         User     @relation(fields: [userId], references: [id])
}

model GithubProfile {
  id            String   @id @default(cuid())
  userId        String
  username      String
  summaryJson   Json?     // per-repo summaries (tech, features, complexity)
  fetchedAt     DateTime @default(now())
}

model Interview {
  id            String   @id @default(cuid())
  userId        String
  targetRole    String
  status        InterviewStatus @default(PENDING)
  createdAt     DateTime @default(now())
  completedAt   DateTime?
  questions     Question[]
  report        Report?
  user          User     @relation(fields: [userId], references: [id])
}

enum InterviewStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
}

model Question {
  id           String   @id @default(cuid())
  interviewId  String
  category     QuestionCategory
  text         String
  order        Int
  interview    Interview @relation(fields: [interviewId], references: [id])
  response     Response?
}

enum QuestionCategory {
  PROJECT
  TECHNICAL
  HR
}

model Response {
  id             String   @id @default(cuid())
  questionId     String   @unique
  audioUrl       String?
  transcript     String?
  accuracyScore  Int?
  clarityScore   Int?
  completenessScore Int?
  communicationScore Int?
  feedback       String?
  question       Question @relation(fields: [questionId], references: [id])
}

model Report {
  id                String   @id @default(cuid())
  interviewId       String   @unique
  overallScore      Int
  technicalScore    Int
  communicationScore Int
  projectScore      Int
  hrScore           Int
  strengths         Json      // string[]
  weaknesses        Json      // string[]
  suggestions       Json      // string[]
  createdAt         DateTime @default(now())
  interview         Interview @relation(fields: [interviewId], references: [id])
}
```

Schema notes for scalability (Phase 2+): `Response.audioUrl` already supports swapping to `videoUrl` later; add a `FaceMetrics`/`VoiceMetrics` table without touching existing tables; `Question` already has `category`, so a `CODING` category can be added later without migration pain.

---

## 6. API Contracts

### Next.js route handlers (thin wrappers, do auth + DB, delegate AI work to Python service)
- `POST /api/auth/register` — create user
- `POST /api/auth/login` — NextAuth credentials
- `POST /api/resume/upload` — store file, call `ai-service:/resume/parse`, save `parsedJson`
- `POST /api/github/analyze` — call `ai-service:/github/analyze`, save `summaryJson`
- `POST /api/interview/start` — call `ai-service:/questions/generate` with resume+github+role, create `Interview` + `Question` rows
- `POST /api/interview/[id]/answer` — upload audio for a question, call `ai-service:/transcribe`, then `ai-service:/evaluate`, save `Response`
- `POST /api/interview/[id]/complete` — aggregate scores, call `ai-service:/report/generate` (or compute in Next.js), save `Report`
- `GET /api/interview/[id]/report` — fetch report
- `GET /api/admin/students` — list users + latest overall score (ADMIN only)

### Python FastAPI service (`ai-service`)
- `POST /resume/parse` → `{ fileUrl }` → returns `{ skills, projects, education, experience, score, suggestions }`
- `POST /github/analyze` → `{ username }` → returns `[{ repo, languages, frameworks, complexity, features, isLikelyTutorial }]`
- `POST /questions/generate` → `{ resumeJson, githubSummary, targetRole }` → returns `{ questions: [{ category, text }] }` (aim ~12–15 total: 5 project, 5 technical, 5 HR)
- `POST /transcribe` → `{ audioUrl }` → returns `{ transcript }`
- `POST /evaluate` → `{ questionText, transcript, category }` → returns `{ accuracy, clarity, completeness, communication, feedback }`
- `POST /report/generate` → `{ responses: [...] }` → returns `{ overallScore, technicalScore, communicationScore, projectScore, hrScore, strengths, weaknesses, suggestions }`

All Python endpoints are stateless; Next.js owns persistence. This keeps the AI service replaceable/scalable independently (e.g. move it to its own container/queue later).

---

## 7. Core Prompts (starting point — put in `prompts/` and iterate)

**Question generation** — instruct the LLM to: use resume skills + GitHub project summaries + target role; generate 5 project-specific questions referencing actual repo names/tech, 5 technical questions matched to listed skills, 5 HR/behavioral questions; avoid generic phrasing; return strict JSON array with `category` and `text`.

**Answer evaluation** — instruct the LLM to: score 0–100 on accuracy, clarity, completeness, communication given the question, the transcript, and the category; penalize vague or evasive answers; always include one concrete, actionable improvement suggestion; return strict JSON.

**Resume extraction** — instruct the LLM to: extract skills, projects (name + one-line description + tech used), education, experience, and give a 0–100 resume score with 2–4 specific improvement suggestions; return strict JSON.

Keep every LLM call's output schema strict JSON with a defined shape — validate on the Python side and retry once on parse failure.

---

## 8. Frontend Pages (MVP)
- `/register`, `/login`
- `/dashboard` — profile completion %, resume score, GitHub status, "Start New Interview" button, past interviews list
- `/onboarding` — resume upload + GitHub username + preferred role (one-time, editable later)
- `/interview/[id]` — one question at a time, mic record button, waveform/timer, "Next question" after transcript confirmation, progress bar
- `/report/[id]` — overall + category scores (simple bar/number display), strengths, weaknesses, suggestions
- `/admin` — table of students with latest overall score, filter by college/branch (single college for now, so filter is optional)

---

## 9. Non-Functional Requirements
- **Cost control:** cap GitHub analysis to top 3–5 repos by recency/stars, not all repos. Cap resume text sent to LLM. Log token/API usage per interview so you can compute actual cost-per-interview before setting subscription pricing.
- **Reliability:** every AI-service call wrapped in try/catch with a user-visible retry; interview state must survive a page refresh (persist `IN_PROGRESS` status + last answered question).
- **Data privacy:** resumes and audio are personal data — restrict file access to owner + admin, signed/short-lived URLs if moved to S3.
- **Latency:** transcription + evaluation should complete within ~10–15s per answer so the interview feels responsive; show a "processing" state, don't block the mic for the next question longer than necessary.

---

## 10. Phase 2+ (not built now, schema/architecture must not block these later)
- Video recording (swap `audioUrl` pattern for `videoUrl`, add `FaceMetrics` table)
- Voice/face-based confidence signals (speaking rate, pause duration, filler-word count — audio-derived, not facial-expression-based; see separate AI-models note)
- Coding questions with an actual code editor + test-case judge
- Company-specific interview modes
- Recruiter/admin analytics, leaderboards
- Multilingual interviews

---

## 11. Build Order (give this to the AI agent as milestones)
1. Repo scaffold (Next.js app + Python service + Postgres via docker-compose) + Prisma schema + migrations
2. Auth (register/login/dashboard shell)
3. Resume upload → Python parse → store + display score/suggestions
4. GitHub analyze → Python fetch/summarize → store + display
5. Question generation → store `Question` rows → interview start screen
6. Voice interview UI (MediaRecorder) → upload audio → transcribe → show transcript
7. Evaluation per answer → store scores
8. Report aggregation + report page
9. Admin student list page
10. End-to-end test with one real student profile before calling it done

**Definition of done for MVP:** a student can register → upload resume → connect GitHub → click Start Interview → answer ~12 AI-generated questions by voice → see a report with overall score, category scores, strengths, weaknesses, and suggestions — end to end, with no manual intervention.
