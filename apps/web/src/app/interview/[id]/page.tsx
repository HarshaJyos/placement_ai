"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Mic, Square, Loader2, ChevronRight, RefreshCw, Award, Sparkles, Check } from "lucide-react";

export default function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: interviewId } = React.use(params);
  const { data: session, status } = useSession();
  const router = useRouter();

  // Interview state
  const [interview, setInterview] = useState<any>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioRecorder, setAudioRecorder] = useState<MediaRecorder | null>(null);
  const [videoRecorder, setVideoRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [videoChunks, setVideoChunks] = useState<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Submit / Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [responseSaved, setResponseSaved] = useState(false);
  const [tempAudioBlob, setTempAudioBlob] = useState<Blob | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchInterview();
      initCamera();
    }
  }, [status]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera/Mic access error:", err);
    }
  };

  // Handle timer for recording
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingTime(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const fetchInterview = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/interview/${interviewId}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to load interview");

      setInterview(data.interview);

      // Find the first unanswered question
      const questions = data.interview.questions || [];
      const unansweredIdx = questions.findIndex((q: any) => !q.response);
      
      if (unansweredIdx !== -1) {
        setCurrentIdx(unansweredIdx);
      } else {
        // If all answered, go to the last one or show complete
        setCurrentIdx(questions.length - 1);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      setAudioChunks([]);
      setVideoChunks([]);
      setTranscript(null);
      setResponseSaved(false);
      setTempAudioBlob(null);

      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = streamRef.current;
        }
      }

      const stream = streamRef.current;

      // 1. Audio-only recording for Gemini evaluation
      const audioStream = new MediaStream(stream.getAudioTracks());
      const aRecorder = new MediaRecorder(audioStream, { mimeType: "audio/webm" });
      aRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks((prev) => [...prev, event.data]);
        }
      };
      aRecorder.start();
      setAudioRecorder(aRecorder);

      // 2. Video + Audio recording for local visual tracking
      const vRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      vRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setVideoChunks((prev) => [...prev, event.data]);
        }
      };
      vRecorder.start();
      setVideoRecorder(vRecorder);

      setIsRecording(true);
    } catch (err) {
      alert("Microphone and Camera access are required to start mock interview.");
    }
  };

  const stopRecording = () => {
    if (isRecording) {
      if (audioRecorder) audioRecorder.stop();
      if (videoRecorder) videoRecorder.stop();
      setIsRecording(false);
      
      // Delay processing slightly to let data accumulate
      setTimeout(() => {
        processAndUploadAudioVideo();
      }, 600);
    }
  };

  const processAndUploadAudioVideo = () => {
    setAudioChunks((currAudio) => {
      setVideoChunks((currVideo) => {
        if (currAudio.length === 0) return [];
        const audioBlob = new Blob(currAudio, { type: "audio/webm" });
        const videoBlob = new Blob(currVideo, { type: "video/webm" });
        setTempAudioBlob(audioBlob);
        uploadResponse(audioBlob, videoBlob);
        return [];
      });
      return [];
    });
  };

  const uploadResponse = async (audioBlob: Blob, videoBlob: Blob) => {
    setIsProcessing(true);
    setError(null);

    const currentQuestion = interview.questions[currentIdx];
    const formData = new FormData();
    formData.append("file", audioBlob, "response_audio.webm");
    formData.append("video", videoBlob, "response_video.webm");
    formData.append("questionId", currentQuestion.id);

    try {
      const res = await fetch(`/api/interview/${interviewId}/answer`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload answer");

      setResponseSaved(true);
    } catch (err: any) {
      setError(err.message || "An error occurred while uploading your answer");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNextQuestion = () => {
    setTranscript(null);
    setResponseSaved(false);
    setTempAudioBlob(null);
    
    fetchInterview().then(() => {
      if (currentIdx < interview.questions.length - 1) {
        setCurrentIdx((prev) => prev + 1);
      }
    });
  };

  const handleCompleteInterview = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/interview/${interviewId}/complete`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to generate report");

      router.push(`/report/${interviewId}`);
    } catch (err: any) {
      setError(err.message || "An error occurred while compiling the final report");
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-slate-950 text-slate-400">
        <Loader2 size={36} className="animate-spin text-violet-500 mb-4" />
        <p>Loading interview dashboard...</p>
      </div>
    );
  }

  if (error && !interview) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-slate-950 text-slate-400 p-6 text-center">
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl p-8 max-w-md">
          <h3 className="font-bold text-lg mb-2">Error Loading Interview</h3>
          <p className="text-sm mb-6">{error}</p>
          <button
            onClick={fetchInterview}
            className="px-6 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-sm font-semibold hover:border-slate-700 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const questions = interview.questions || [];
  const currentQuestion = questions[currentIdx];
  const progressPercent = Math.round(((currentIdx) / questions.length) * 100);
  const isLastQuestion = currentIdx === questions.length - 1;

  // Check if current question already has an answer in the DB (for page refresh support)
  const existingResponse = currentQuestion?.response;
  const hasAnsweredCurrent = responseSaved || !!existingResponse;
  const currentTranscript = transcript || existingResponse?.transcript;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-950">
      {/* Dynamic circular blurs */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-teal-500/5 blur-[120px] pointer-events-none" />

      {/* Header bar */}
      <header className="w-full border-b border-slate-900 bg-slate-950/60 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 rounded-xl text-white text-xs font-bold uppercase tracking-wider">
            {currentQuestion?.category}
          </div>
          <span className="text-sm font-semibold text-slate-300">
            Mock Interview — {interview.targetRole}
          </span>
        </div>
        <div className="text-slate-400 text-xs font-semibold">
          Question {currentIdx + 1} of {questions.length}
        </div>
      </header>

      {/* Progress bar */}
      <div className="w-full h-1 bg-slate-900 z-10">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-teal-400 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col justify-center items-center px-6 py-12 max-w-3xl mx-auto w-full z-10">
        <div className="w-full text-center space-y-8">
          
          {/* Question Text */}
          <div className="min-h-[100px] flex items-center justify-center">
            <h1 className="text-2xl md:text-3xl font-extrabold leading-relaxed text-slate-100 max-w-2xl px-4">
              &ldquo;{currentQuestion?.text}&rdquo;
            </h1>
          </div>

          {/* Webcam Preview */}
          <div className="w-full max-w-md mx-auto aspect-video rounded-2xl overflow-hidden border border-slate-850 bg-slate-900/60 shadow-2xl relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
            {isRecording && (
              <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/90 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider animate-pulse">
                <span className="w-2 h-2 rounded-full bg-white" />
                Live Recording
              </div>
            )}
            {!isRecording && (
              <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[2px] pointer-events-none flex items-center justify-center">
                <span className="text-xs text-slate-400 font-semibold bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">Camera Feed Active</span>
              </div>
            )}
          </div>

          {/* Micro animation block */}
          {isRecording && (
            <div className="flex justify-center items-center gap-1.5 h-6">
              {[...Array(9)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-teal-400 rounded-full animate-bounce"
                  style={{
                    height: `${Math.random() * 24 + 8}px`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: `${0.6 + Math.random() * 0.4}s`
                  }}
                />
              ))}
            </div>
          )}

          {/* Interface buttons */}
          <div className="flex flex-col items-center gap-4">
            {!hasAnsweredCurrent && !isProcessing && (
              <div className="flex flex-col items-center gap-3">
                {isRecording ? (
                  <button
                    onClick={stopRecording}
                    className="w-20 h-20 rounded-full bg-rose-500 flex items-center justify-center text-white shadow-xl shadow-rose-950/40 hover:scale-105 active:scale-95 transition-all animate-pulse cursor-pointer"
                  >
                    <Square size={24} />
                  </button>
                ) : (
                  <button
                    onClick={startRecording}
                    className="w-20 h-20 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-violet-950/40 hover:scale-105 active:scale-95 transition-all hover:shadow-violet-500/20 cursor-pointer"
                  >
                    <Mic size={28} />
                  </button>
                )}
                
                <span className="text-xs uppercase font-bold tracking-widest text-slate-500">
                  {isRecording ? `Recording (${formatTime(recordingTime)})` : "Click Mic to Answer"}
                </span>
              </div>
            )}

            {isProcessing && (
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-violet-400">
                  <Loader2 size={28} className="animate-spin" />
                </div>
                <span className="text-xs uppercase font-bold tracking-widest text-slate-400 animate-pulse text-center">
                  {hasAnsweredCurrent && isLastQuestion ? "Evaluating entire interview & compiling report..." : "Uploading Response..."}
                </span>
              </div>
            )}

            {hasAnsweredCurrent && !isProcessing && (
              <div className="w-full max-w-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-6 text-left space-y-4">
                <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
                  <Check size={16} /> response captured
                </div>
                
                <p className="text-slate-350 text-sm italic leading-relaxed">
                  {currentTranscript ? (
                    <span>&ldquo;{currentTranscript}&rdquo;</span>
                  ) : (
                    <span>Your answer has been saved successfully. Spoken responses will be batch-evaluated and scored at the very end of the interview.</span>
                  )}
                </p>

                <div className="border-t border-slate-850 pt-4 flex justify-between items-center">
                  <button
                    onClick={startRecording}
                    className="flex items-center gap-2 text-slate-450 hover:text-slate-300 text-xs font-semibold transition-colors"
                  >
                    <RefreshCw size={14} />
                    Re-record Answer
                  </button>
                  
                  {isLastQuestion ? (
                    <button
                      onClick={handleCompleteInterview}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 shadow-md transition-all uppercase tracking-wider"
                    >
                      Finish Interview
                      <Award size={14} />
                    </button>
                  ) : (
                    <button
                      onClick={handleNextQuestion}
                      className="px-6 py-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs font-bold flex items-center gap-1.5 active:scale-95 shadow-md transition-all uppercase tracking-wider"
                    >
                      Next Question
                      <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm max-w-md mx-auto">
              {error}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
