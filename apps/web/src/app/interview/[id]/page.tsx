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

  // Live session states
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

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

  // Webcam & Audio analysis refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadIntervalRef = useRef<number | null>(null);

  // Sync index and questions for safe async access
  const currentIdxRef = useRef(0);
  const questionsRef = useRef<any[]>([]);

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
      // Shutdown camera tracks on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      stopSilenceDetection();
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
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
      setError("Camera and Microphone permissions are required for this live interview.");
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
      questionsRef.current = questions;
      const unansweredIdx = questions.findIndex((q: any) => !q.response);
      
      if (unansweredIdx !== -1) {
        setCurrentIdx(unansweredIdx);
        currentIdxRef.current = unansweredIdx;
      } else {
        setCurrentIdx(questions.length - 1);
        currentIdxRef.current = questions.length - 1;
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const speakQuestion = (text: string, onEnd: () => void) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsAiSpeaking(true);

      const cleanText = text.replace(/[*_`#]/g, "");
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voices = window.speechSynthesis.getVoices();
      // Prefer Google or clear English voices
      const englishVoice = voices.find(
        (v) => v.lang.startsWith("en-") && v.name.includes("Google")
      ) || voices.find((v) => v.lang.startsWith("en-"));
      
      if (englishVoice) {
        utterance.voice = englishVoice;
      }
      
      utterance.rate = 1.05; // slightly faster for responsiveness
      utterance.onend = () => {
        setIsAiSpeaking(false);
        onEnd();
      };
      utterance.onerror = (e) => {
        setIsAiSpeaking(false);
        if (e.error === "interrupted" || e.error === "canceled") {
          return;
        }
        console.error("Speech error:", e);
        onEnd();
      };
      
      window.speechSynthesis.speak(utterance);
    } else {
      onEnd();
    }
  };

  const startSilenceDetection = (stream: MediaStream, onSilence: () => void) => {
    try {
      stopSilenceDetection();
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const audioCtx = new AudioContextClass();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const SILENCE_THRESHOLD = 15;
      const SILENCE_DURATION = 2800; // 2.8 seconds of silence to proceed
      let silenceStart = Date.now();

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        
        let total = 0;
        for (let i = 0; i < bufferLength; i++) {
          total += dataArray[i];
        }
        const average = total / bufferLength;

        if (average > SILENCE_THRESHOLD) {
          silenceStart = Date.now(); // user is speaking
        } else {
          if (Date.now() - silenceStart > SILENCE_DURATION) {
            stopSilenceDetection();
            onSilence();
            return;
          }
        }
        vadIntervalRef.current = requestAnimationFrame(checkVolume);
      };

      vadIntervalRef.current = requestAnimationFrame(checkVolume);
    } catch (err) {
      console.error("VAD error:", err);
    }
  };

  const stopSilenceDetection = () => {
    if (vadIntervalRef.current) {
      cancelAnimationFrame(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
    }
    analyserRef.current = null;
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

      // 2. Video + Audio recording for local storage
      const vRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      vRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setVideoChunks((prev) => [...prev, event.data]);
        }
      };
      vRecorder.start();
      setVideoRecorder(vRecorder);

      setIsRecording(true);

      // Start Silence Auto-detection
      startSilenceDetection(stream, () => {
        stopRecording();
      });
    } catch (err) {
      alert("Microphone and Camera access are required to start mock interview.");
    }
  };

  const stopRecording = () => {
    if (isRecording) {
      stopSilenceDetection();
      if (audioRecorder) audioRecorder.stop();
      if (videoRecorder) videoRecorder.stop();
      setIsRecording(false);
      
      const currentQuestion = questionsRef.current[currentIdxRef.current];
      const questionId = currentQuestion?.id || "";

      // Delay processing slightly to let data accumulate
      setTimeout(() => {
        processAndUploadAudioVideo(questionId);
      }, 600);
    }
  };

  const processAndUploadAudioVideo = (questionId: string) => {
    setAudioChunks((currAudio) => {
      setVideoChunks((currVideo) => {
        if (currAudio.length === 0) return [];
        const audioBlob = new Blob(currAudio, { type: "audio/webm" });
        const videoBlob = new Blob(currVideo, { type: "video/webm" });
        setTempAudioBlob(audioBlob);
        uploadResponse(audioBlob, videoBlob, questionId);
        return [];
      });
      return [];
    });
  };

  const uploadResponse = async (audioBlob: Blob, videoBlob: Blob, questionId: string) => {
    setIsProcessing(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", audioBlob, "response_audio.webm");
    formData.append("video", videoBlob, "response_video.webm");
    formData.append("questionId", questionId);

    try {
      const res = await fetch(`/api/interview/${interviewId}/answer`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload answer");

      setResponseSaved(true);

      // Auto progress flow - safe check with Refs
      if (currentIdxRef.current < questionsRef.current.length - 1) {
        setTimeout(() => {
          handleNextQuestionAuto();
        }, 1200);
      } else {
        setTimeout(() => {
          handleCompleteInterview();
        }, 1200);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while uploading your answer");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNextQuestionAuto = () => {
    setTranscript(null);
    setResponseSaved(false);
    setTempAudioBlob(null);
    
    // Update ref immediately to prevent race conditions during setTimeouts
    const newIdx = currentIdxRef.current + 1;
    currentIdxRef.current = newIdx;
    setCurrentIdx(newIdx);

    if (newIdx < questionsRef.current.length) {
      setTimeout(() => {
        speakQuestion(questionsRef.current[newIdx].text, () => {
          startRecording();
        });
      }, 400);
    }
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-slate-950 text-slate-400">
        <Loader2 size={36} className="animate-spin text-violet-500 mb-4" />
        <p>Loading live interview session...</p>
      </div>
    );
  }

  if (error && !interview) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-slate-950 text-slate-400 p-6 text-center">
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl p-8 max-w-md">
          <h3 className="font-bold text-lg mb-2">Access Error</h3>
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
  const existingResponse = currentQuestion?.response;
  const hasAnsweredCurrent = responseSaved || !!existingResponse;
  const currentTranscript = transcript || existingResponse?.transcript;

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-950 h-screen w-screen">
      {/* Fullscreen Webcam Video */}
      <div className="absolute inset-0 w-full h-full z-0 bg-slate-950">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform -scale-x-100"
        />
        {/* Dark Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-slate-950/60 pointer-events-none" />
      </div>

      {/* Landing Start Screen Overlay */}
      {!interviewStarted && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <div className="max-w-md w-full bg-slate-900/60 border border-slate-800 backdrop-blur-xl rounded-3xl p-8 text-center space-y-6 shadow-2xl">
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-indigo-400 to-teal-400">
              Live AI Interview
            </h1>
            <p className="text-slate-350 text-sm leading-relaxed font-medium">
              You are about to begin a live interactive simulation for the role of <strong className="text-violet-400">{interview?.targetRole || "Software Engineer"}</strong>.
            </p>
            <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-850 text-left space-y-2.5 text-xs text-slate-400 leading-normal">
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                The AI will read each question aloud.
              </p>
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                Speak your answer naturally when the mic turns on.
              </p>
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                The system will auto-detect silence and move to the next question.
              </p>
            </div>
            <button
              onClick={() => {
                setInterviewStarted(true);
                if (questionsRef.current.length > 0) {
                  const firstQuestion = questionsRef.current[currentIdxRef.current];
                  if (firstQuestion) {
                    speakQuestion(firstQuestion.text, () => {
                      startRecording();
                    });
                  }
                }
              }}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-violet-500/25 active:scale-[0.98] transition-all cursor-pointer"
            >
              Begin Live Interview
            </button>
          </div>
        </div>
      )}

      {/* Floating Status Indicators (Top Bar) */}
      <header className="absolute top-0 inset-x-0 bg-gradient-to-b from-slate-950/80 to-transparent px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-200">
            AI Live Interview — {interview?.targetRole}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Status Badge */}
          {isAiSpeaking && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-600/80 backdrop-blur-sm border border-violet-500/30 text-white text-xs font-semibold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              AI Speaking...
            </div>
          )}
          {isRecording && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-600/80 backdrop-blur-sm border border-rose-500/30 text-white text-xs font-semibold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white" />
              Listening...
            </div>
          )}
          {isProcessing && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 backdrop-blur-sm border border-slate-750 text-slate-200 text-xs font-semibold">
              <Loader2 size={12} className="animate-spin text-teal-400" />
              {isLastQuestion && responseSaved ? "Analyzing..." : "Saving..."}
            </div>
          )}
          <span className="text-slate-350 text-xs font-semibold bg-slate-900/60 px-3 py-1.5 rounded-full border border-slate-850/50">
            Question {currentIdx + 1} of {questions.length}
          </span>
        </div>
      </header>

      {/* Progress bar overlay */}
      <div className="absolute top-[64px] inset-x-0 h-1 bg-slate-950/40 z-10">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-teal-400 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Centered Glassmorphic Question Card (Bottom Area) */}
      <div className="absolute bottom-10 inset-x-0 px-6 flex justify-center z-10">
        <div className="max-w-2xl w-full bg-slate-950/60 border border-slate-800/80 backdrop-blur-xl rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative">
          
          {/* Category Tag */}
          <div className="absolute top-[-14px] left-8 bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1 rounded-xl text-white text-[10px] font-bold uppercase tracking-wider shadow-md">
            {currentQuestion?.category}
          </div>

          <div className="space-y-4">
            {/* Question Text */}
            <div className="min-h-[60px] flex items-center justify-center">
              <h1 className="text-xl md:text-2xl font-bold leading-relaxed text-slate-100 text-center">
                &ldquo;{currentQuestion?.text}&rdquo;
              </h1>
            </div>

            {/* Bottom Actions Row */}
            <div className="border-t border-slate-800/60 pt-4 flex justify-between items-center text-xs">
              <button
                onClick={() => {
                  stopSilenceDetection();
                  const curQuestion = questionsRef.current[currentIdxRef.current];
                  if (curQuestion) {
                    speakQuestion(curQuestion.text, () => {
                      startRecording();
                    });
                  }
                }}
                disabled={isAiSpeaking || isProcessing}
                className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 font-semibold transition-colors disabled:opacity-30 cursor-pointer"
              >
                <RefreshCw size={14} />
                Repeat Question
              </button>

              {isRecording && (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-1.5 bg-rose-600/85 hover:bg-rose-500 text-white font-bold px-4 py-2 rounded-xl active:scale-95 shadow-md shadow-rose-950/20 transition-all uppercase tracking-wider cursor-pointer"
                >
                  <Square size={12} />
                  Stop & Save Now
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
