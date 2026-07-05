"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Mic, Square, Loader2, RefreshCw, Award, Volume2, ChevronRight } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Question { id: string; text: string; category: string; order: number; response?: any }
interface Interview  { id: string; targetRole: string; questions: Question[] }

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${ss < 10 ? "0" : ""}${ss}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: interviewId } = React.use(params);
  const { status } = useSession();
  const router = useRouter();

  // ── interview data ──────────────────────────────────────────────────
  const [interview, setInterview] = useState<Interview | null>(null);
  const interviewRef = useRef<Interview | null>(null); // stable ref for async access

  // ── UI phase ────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<
    "loading" | "error" | "ready" | "ai_speaking" | "recording" | "saving" | "done"
  >("loading");
  const [qIdx, setQIdx]   = useState(0);
  const qIdxRef           = useRef(0);          // stable ref
  const [recTime, setRecTime] = useState(0);
  const [errMsg, setErrMsg]   = useState<string | null>(null);

  // ── media refs ──────────────────────────────────────────────────────
  const videoRef        = useRef<HTMLVideoElement>(null);
  const streamRef       = useRef<MediaStream | null>(null);
  const aRecRef         = useRef<MediaRecorder | null>(null);
  const vRecRef         = useRef<MediaRecorder | null>(null);
  const aChunks         = useRef<Blob[]>([]);
  const vChunks         = useRef<Blob[]>([]);
  const aStoppedRef     = useRef(false);   // track both onstop events
  const vStoppedRef     = useRef(false);
  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef        = useRef(phase);   // avoid stale closures in VAD

  // ── VAD refs ────────────────────────────────────────────────────────
  const actxRef         = useRef<AudioContext | null>(null);
  const analyserRef     = useRef<AnalyserNode | null>(null);
  const rafRef          = useRef<number | null>(null);

  // Keep phaseRef in sync
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ── Auth guard ──────────────────────────────────────────────────────
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated")  { fetchInterview(); initCamera(); }
  }, [status]);

  // ── Cleanup on unmount ──────────────────────────────────────────────
  useEffect(() => () => {
    stopVAD();
    window.speechSynthesis?.cancel();
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  // ── Recording timer ─────────────────────────────────────────────────
  useEffect(() => {
    if (phase === "recording") {
      setRecTime(0);
      timerRef.current = setInterval(() => setRecTime(p => p + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
  }, [phase]);

  // ── Camera init ─────────────────────────────────────────────────────
  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setErrMsg("Camera and Microphone access is required. Please allow permissions and refresh.");
    }
  };

  // ── Fetch interview ─────────────────────────────────────────────────
  const fetchInterview = async () => {
    try {
      const res  = await fetch(`/api/interview/${interviewId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load interview");

      interviewRef.current = data.interview;
      setInterview(data.interview);

      const qs = (data.interview.questions as Question[]) || [];
      const first = qs.findIndex(q => !q.response);
      const idx   = first === -1 ? qs.length - 1 : first;
      qIdxRef.current = idx;
      setQIdx(idx);
      setPhase("ready");
    } catch (e: any) {
      setErrMsg(e.message || "Failed to load interview");
      setPhase("error");
    }
  };

  // ── TTS speak ───────────────────────────────────────────────────────
  const speak = useCallback((text: string, onDone: () => void) => {
    if (!window.speechSynthesis) { onDone(); return; }
    window.speechSynthesis.cancel();
    setPhase("ai_speaking");

    const utt    = new SpeechSynthesisUtterance(text.replace(/[*_`#]/g, ""));
    const voices = window.speechSynthesis.getVoices();
    const voice  = voices.find(v => v.lang.startsWith("en-") && v.name.includes("Google"))
                || voices.find(v => v.lang.startsWith("en-"));
    if (voice) utt.voice = voice;
    utt.rate  = 1.0;
    utt.pitch = 1;

    utt.onend   = () => onDone();
    utt.onerror = (e) => {
      if (e.error === "interrupted" || e.error === "canceled") return;
      onDone(); // fallback
    };
    window.speechSynthesis.speak(utt);
  }, []);

  // ── VAD (voice activity detection) ─────────────────────────────────
  const stopVAD = () => {
    if (rafRef.current)   { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (actxRef.current && actxRef.current.state !== "closed") actxRef.current.close();
    actxRef.current  = null;
    analyserRef.current = null;
  };

  const startVAD = (stream: MediaStream, onSilence: () => void) => {
    stopVAD();
    try {
      const AC   = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      const ctx  = new AC();
      const src  = ctx.createMediaStreamSource(stream);
      const an   = ctx.createAnalyser();
      an.fftSize = 512;
      src.connect(an);
      actxRef.current  = ctx;
      analyserRef.current = an;

      const buf   = new Uint8Array(an.frequencyBinCount);
      const THR   = 12;        // amplitude threshold
      const WAIT  = 3000;      // ms of silence before auto-stop
      let silStart = Date.now();
      let hasSpokeOnce = false;

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(buf);
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length;

        if (avg > THR) {
          hasSpokeOnce = true;
          silStart = Date.now();
        } else if (hasSpokeOnce && Date.now() - silStart > WAIT) {
          stopVAD();
          onSilence();
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      console.error("VAD error:", err);
    }
  };

  // ── Recording ───────────────────────────────────────────────────────
  const startRecording = useCallback(async (capturedQId: string) => {
    if (phaseRef.current === "recording") return; // guard

    // Ensure stream is alive
    if (!streamRef.current || streamRef.current.getTracks().some(t => t.readyState === "ended")) {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch {
        setErrMsg("Microphone access was denied. Please refresh and allow permissions.");
        return;
      }
    }

    const stream = streamRef.current!;
    aChunks.current  = [];
    vChunks.current  = [];
    aStoppedRef.current = false;
    vStoppedRef.current = false;

    const onBothStopped = () => {
      const audio = new Blob(aChunks.current, { type: "audio/webm" });
      const video = new Blob(vChunks.current, { type: "video/webm" });
      uploadAnswer(capturedQId, audio, video);
    };

    // Audio recorder (for Gemini evaluation)
    const audioOnly = new MediaStream(stream.getAudioTracks());
    const aRec = new MediaRecorder(audioOnly, { mimeType: "audio/webm" });
    aRec.ondataavailable = e => { if (e.data.size > 0) aChunks.current.push(e.data); };
    aRec.onstop = () => {
      aStoppedRef.current = true;
      if (vStoppedRef.current) onBothStopped();
    };

    // Video recorder (for local storage)
    const vRec = new MediaRecorder(stream, { mimeType: "video/webm" });
    vRec.ondataavailable = e => { if (e.data.size > 0) vChunks.current.push(e.data); };
    vRec.onstop = () => {
      vStoppedRef.current = true;
      if (aStoppedRef.current) onBothStopped();
    };

    aRecRef.current = aRec;
    vRecRef.current = vRec;
    aRec.start();
    vRec.start();
    setPhase("recording");

    // VAD auto-stop
    startVAD(stream, () => stopRecording());
  }, []);

  const stopRecording = useCallback(() => {
    if (phaseRef.current !== "recording") return;
    setPhase("saving");
    stopVAD();
    if (aRecRef.current?.state !== "inactive") aRecRef.current?.stop();
    if (vRecRef.current?.state !== "inactive") vRecRef.current?.stop();
  }, []);

  // ── Upload answer ────────────────────────────────────────────────────
  const uploadAnswer = async (questionId: string, audio: Blob, video: Blob) => {
    setPhase("saving");
    setErrMsg(null);

    const form = new FormData();
    form.append("file",       audio, "audio.webm");
    form.append("video",      video, "video.webm");
    form.append("questionId", questionId);

    try {
      const res  = await fetch(`/api/interview/${interviewId}/answer`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save answer");

      const iv  = interviewRef.current!;
      const cur = qIdxRef.current;

      if (cur < iv.questions.length - 1) {
        // Move to next question
        const nextIdx = cur + 1;
        qIdxRef.current = nextIdx;
        setQIdx(nextIdx);

        // Brief pause then speak next question
        setTimeout(() => {
          const nextQ = interviewRef.current!.questions[nextIdx];
          speak(nextQ.text, () => startRecording(nextQ.id));
        }, 600);
      } else {
        // Last question — finish interview
        finishInterview();
      }
    } catch (e: any) {
      setErrMsg(e.message || "Failed to save your answer. Please try again.");
      setPhase("recording"); // allow retry
    }
  };

  // ── Finish interview ─────────────────────────────────────────────────
  const finishInterview = async () => {
    setPhase("done");
    try {
      const res  = await fetch(`/api/interview/${interviewId}/complete`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not generate report");
      router.push(`/report/${interviewId}`);
    } catch (e: any) {
      setErrMsg(e.message || "Failed to generate report. Please refresh the page.");
      setPhase("error");
    }
  };

  // ── Begin interview (user presses Start) ────────────────────────────
  const beginInterview = () => {
    const iv = interviewRef.current;
    if (!iv) return;
    const q = iv.questions[qIdxRef.current];
    if (!q) return;
    speak(q.text, () => startRecording(q.id));
  };

  // ── Repeat current question ─────────────────────────────────────────
  const repeatQuestion = () => {
    const iv = interviewRef.current;
    if (!iv) return;
    const q = iv.questions[qIdxRef.current];
    if (!q) return;
    stopVAD();
    if (phaseRef.current === "recording") {
      // stop current recording silently, no upload
      aRecRef.current?.stop();
      vRecRef.current?.stop();
      aStoppedRef.current = true;
      vStoppedRef.current = true;
    }
    speak(q.text, () => startRecording(q.id));
  };

  // ── Derived values ───────────────────────────────────────────────────
  const qs          = interview?.questions ?? [];
  const currentQ    = qs[qIdx];
  const total       = qs.length;
  const pct         = total > 0 ? Math.round(((qIdx + 1) / total) * 100) : 0;
  const catColor: Record<string, string> = {
    PROJECT:   "bg-violet-600",
    TECHNICAL: "bg-blue-600",
    HR:        "bg-teal-600",
  };

  // ── Phase label & color for status pill ────────────────────────────
  const statusPill = () => {
    if (phase === "ai_speaking") return { label: "AI Speaking", cls: "bg-violet-600/90 animate-pulse" };
    if (phase === "recording")   return { label: `🔴 Listening  ${fmtTime(recTime)}`, cls: "bg-rose-600/90 animate-pulse" };
    if (phase === "saving")      return { label: "Saving...", cls: "bg-amber-600/80" };
    if (phase === "done")        return { label: "Analyzing...", cls: "bg-teal-600/80" };
    return null;
  };
  const pill = statusPill();

  // ─── Render ──────────────────────────────────────────────────────────
  if (phase === "loading") return (
    <div className="h-screen bg-slate-950 flex items-center justify-center flex-col gap-4 text-slate-400">
      <Loader2 size={40} className="animate-spin text-violet-500" />
      <p className="text-sm">Loading your interview session...</p>
    </div>
  );

  if (phase === "error") return (
    <div className="h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-rose-950/30 border border-rose-800/50 rounded-2xl p-8 text-center">
        <h2 className="text-rose-400 font-bold text-xl mb-3">Something went wrong</h2>
        <p className="text-slate-400 text-sm mb-6">{errMsg}</p>
        <button onClick={fetchInterview} className="px-6 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm font-semibold hover:border-slate-500 transition-colors">
          Retry
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen w-screen bg-[#1a1a2e] flex flex-col overflow-hidden select-none">

      {/* ── TOP BAR ─────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-5 py-3 bg-[#16213e]/90 border-b border-white/5 backdrop-blur-sm z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-semibold text-white">AI Interview</span>
          <span className="text-slate-400 text-xs">·</span>
          <span className="text-slate-400 text-xs font-medium">{interview?.targetRole}</span>
        </div>

        <div className="flex items-center gap-3">
          {pill && (
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-white text-xs font-semibold ${pill.cls}`}>
              {pill.label}
            </span>
          )}
          {/* Question counter */}
          <span className="text-xs text-slate-400 bg-white/5 border border-white/10 px-3 py-1 rounded-full font-mono">
            Q {qIdx + 1} / {total}
          </span>
        </div>
      </header>

      {/* ── PROGRESS BAR ────────────────────────────────────────── */}
      <div className="h-0.5 bg-white/5 shrink-0">
        <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
      </div>

      {/* ── MAIN AREA (Zoom-style) ───────────────────────────────── */}
      <main className="flex-1 flex gap-3 p-3 overflow-hidden min-h-0">

        {/* ── LEFT: Webcam (large) ─────────────────────────────── */}
        <div className="flex-1 relative rounded-2xl overflow-hidden bg-slate-900 min-w-0">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
          {/* Name label */}
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur px-3 py-1 rounded-lg text-white text-xs font-semibold">
            You
          </div>
          {/* Recording dot */}
          {phase === "recording" && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-red-600/80 backdrop-blur px-2.5 py-1 rounded-full">
              <div className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span className="text-white text-[10px] font-bold">{fmtTime(recTime)}</span>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ──────────────────────────────────────── */}
        <div className="w-[340px] flex flex-col gap-3 shrink-0">

          {/* AI Avatar Card */}
          <div className="bg-[#0f3460]/60 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-3 relative overflow-hidden">
            {/* animated rings when speaking */}
            {phase === "ai_speaking" && (
              <>
                <div className="absolute inset-0 rounded-2xl border-2 border-violet-500/30 animate-ping" />
                <div className="absolute inset-2 rounded-xl border border-violet-500/20 animate-pulse" />
              </>
            )}
            <div className={`relative w-20 h-20 rounded-full flex items-center justify-center text-4xl font-bold ${
              phase === "ai_speaking" ? "bg-violet-600 shadow-lg shadow-violet-500/40" : "bg-slate-700"
            } transition-all duration-300`}>
              🤖
              {phase === "ai_speaking" && (
                <div className="absolute inset-0 rounded-full border-4 border-violet-400/60 animate-ping" />
              )}
            </div>
            <div className="text-center">
              <p className="text-white text-sm font-bold">AI Interviewer</p>
              <p className="text-slate-400 text-xs mt-0.5">
                {phase === "ai_speaking" ? "Asking question..." : phase === "recording" ? "Listening to you..." : phase === "saving" ? "Processing..." : "Ready"}
              </p>
            </div>
          </div>

          {/* Question Card */}
          <div className="flex-1 bg-[#16213e]/80 border border-white/10 rounded-2xl p-4 flex flex-col gap-3 min-h-0 overflow-auto">
            {/* Category pill */}
            {currentQ && (
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase tracking-widest text-white px-2.5 py-1 rounded-lg ${catColor[currentQ.category] ?? "bg-slate-700"}`}>
                  {currentQ.category}
                </span>
                <span className="text-slate-500 text-[10px] font-mono">Q{qIdx + 1}</span>
              </div>
            )}

            {/* Question text */}
            <div className="flex-1">
              {currentQ ? (
                <p className="text-white font-semibold text-sm leading-relaxed">
                  &ldquo;{currentQ.text}&rdquo;
                </p>
              ) : (
                <p className="text-slate-500 text-sm italic">Loading question...</p>
              )}
            </div>

            {/* Phase hint */}
            <div className="text-xs text-slate-500 bg-white/3 border border-white/5 rounded-lg px-3 py-2">
              {phase === "ready"       && "Press Begin Interview to start."}
              {phase === "ai_speaking" && "Listen carefully to the question."}
              {phase === "recording"   && "Speak clearly — mic is live. Auto-stops on silence."}
              {phase === "saving"      && "Saving your response, please wait..."}
              {phase === "done"        && "Compiling your report..."}
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-2">
            {/* Error banner */}
            {errMsg && (
              <div className="bg-rose-950/60 border border-rose-700/40 rounded-xl px-3 py-2 text-rose-300 text-xs">
                {errMsg}
              </div>
            )}

            {/* Ready — begin button */}
            {phase === "ready" && (
              <button
                onClick={beginInterview}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-violet-700/30 active:scale-[0.98] transition-all"
              >
                🚀 Begin Interview
              </button>
            )}

            {/* Recording controls */}
            {(phase === "recording" || phase === "ai_speaking") && (
              <div className="flex gap-2">
                <button
                  onClick={stopRecording}
                  disabled={phase !== "recording"}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold text-sm active:scale-[0.98] transition-all"
                >
                  <Square size={14} />
                  Done Answering
                </button>
                <button
                  onClick={repeatQuestion}
                  title="Repeat question"
                  className="w-12 h-12 rounded-xl bg-white/8 hover:bg-white/15 border border-white/10 flex items-center justify-center text-slate-300 transition-all"
                >
                  <RefreshCw size={15} />
                </button>
              </div>
            )}

            {/* Saving/done spinner */}
            {(phase === "saving" || phase === "done") && (
              <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/8 text-slate-300 text-sm">
                <Loader2 size={16} className="animate-spin text-violet-400" />
                {phase === "saving" ? "Saving response..." : "Generating report..."}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
