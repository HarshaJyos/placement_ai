"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Sparkles,
  FileText,
  Award,
  Calendar,
  Play,
  LogOut,
  User,
  Loader2,
  TrendingUp,
  Clock,
  ArrowRight,
  ClipboardList
} from "lucide-react";
import { Github } from "@/components/icons";
import Link from "next/link";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [startLoading, setStartLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchDashboardData();
    }
  }, [status]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/user/profile");

      if (res.status === 404 || res.status === 401) {
        // Stale cookie detected: user deleted from database (e.g. database reset)
        signOut({ callbackUrl: "/login" });
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load dashboard data");

      // If onboarding is incomplete, redirect there instantly (keep loader visible)
      if (!data.user.preferredRole || data.user.resumes.length === 0) {
        router.push("/onboarding");
        return;
      }

      setProfile(data.user);
      setInterviews(data.interviews || []);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  };

  const handleStartInterview = async () => {
    setStartLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/interview/start", {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to start interview");

      router.push(`/interview/${data.interview.id}`);
    } catch (err: any) {
      setError(err.message || "Could not generate interview");
      setStartLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-slate-950 text-slate-400">
        <Loader2 size={36} className="animate-spin text-violet-500 mb-4" />
        <p>Loading your placement dashboard...</p>
      </div>
    );
  }

  const latestResume = profile?.resumes?.[0];
  const resumeScore = latestResume?.score || 0;
  const githubProfile = profile?.githubUrl?.split("/").pop() || "Not Connected";

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 min-h-full">
      {/* Glow Backdrops */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] rounded-full bg-teal-500/5 blur-[120px] pointer-events-none" />

      {/* Header bar */}
      <header className="w-full border-b border-slate-900 bg-slate-950/60 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2 font-bold text-lg text-slate-100">
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-violet-500/25">
            <Sparkles size={18} />
          </div>
          <span>PlacementAI</span>
        </div>
        <div className="flex items-center gap-4">
          {profile?.role === "ADMIN" && (
            <Link
              href="/admin"
              className="text-teal-400 hover:text-teal-300 text-sm font-semibold transition-colors border border-teal-500/20 px-3 py-1.5 rounded-lg bg-teal-950/10"
            >
              Admin View
            </Link>
          )}
          <div className="flex items-center gap-2 text-sm text-slate-300 border-r border-slate-800 pr-4">
            <User size={16} className="text-slate-400" />
            <span className="font-semibold">{profile?.fullName}</span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 text-sm"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10 grid grid-cols-1 lg:grid-cols-4 gap-8 z-10">
        
        {/* Left Sidebar: Profile Summary */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 flex items-center justify-center text-white text-xl font-black mb-4">
                {profile?.fullName ? profile.fullName.split(" ").map((n: string) => n[0]).join("") : ""}
              </div>
              <h3 className="font-bold text-lg text-white">{profile?.fullName}</h3>
              <p className="text-xs text-slate-400 mt-1 uppercase font-semibold tracking-wider">
                {profile?.preferredRole}
              </p>
            </div>

            <div className="border-t border-slate-850 pt-5 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400 flex items-center gap-2">
                  <FileText size={16} /> Resume Score
                </span>
                <span className="font-bold text-violet-400">{resumeScore}/100</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400 flex items-center gap-2">
                  <Github size={16} /> GitHub
                </span>
                <span className="font-bold text-teal-400 text-xs truncate max-w-[120px]" title={githubProfile}>
                  {githubProfile}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400 flex items-center gap-2">
                  <Award size={16} /> Branch
                </span>
                <span className="font-semibold text-slate-350 text-xs text-right max-w-[120px] truncate">
                  {profile?.branch || "N/A"}
                </span>
              </div>
            </div>

            <Link
              href="/onboarding"
              className="block text-center text-xs text-violet-400 hover:text-violet-300 font-semibold transition-colors mt-4"
            >
              Edit Profile details
            </Link>
          </div>
        </div>

        {/* Right Dashboard Area */}
        <div className="lg:col-span-3 space-y-8">
          
          {/* Action Row */}
          <div className="bg-gradient-to-r from-violet-900/20 via-indigo-950/10 to-teal-950/5 border border-slate-800/80 rounded-2xl p-8 backdrop-blur-md shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <h2 className="text-2xl font-black text-white">Start a Mock Interview</h2>
              <p className="text-slate-450 text-sm max-w-md">
                Launch a 15-question customized interview based on your current resume and GitHub repositories.
              </p>
            </div>
            
            <button
              onClick={handleStartInterview}
              disabled={startLoading}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold px-6 py-4 rounded-xl shadow-lg hover:shadow-violet-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 min-w-[200px]"
            >
              {startLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  Start Interview
                  <Play size={16} className="fill-white" />
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm text-center">
              {error}
            </div>
          )}

          {/* Past Interviews List */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ClipboardList size={18} className="text-slate-450" />
              Past Interviews
            </h3>

            {interviews.length === 0 ? (
              <div className="border border-slate-850 rounded-2xl p-12 text-center text-slate-500">
                No mock interviews taken yet. Click "Start Interview" above to take your first session.
              </div>
            ) : (
              <div className="space-y-4">
                {interviews.map((iv) => {
                  const dateStr = new Date(iv.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  const isCompleted = iv.status === "COMPLETED";

                  return (
                    <div
                      key={iv.id}
                      className="bg-slate-900/20 border border-slate-850 rounded-xl p-5 flex items-center justify-between hover:border-slate-700 transition-colors"
                    >
                      <div className="space-y-1.5">
                        <h4 className="font-bold text-sm text-white">
                          Mock Interview — {iv.targetRole}
                        </h4>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {dateStr}
                          </span>
                          <span className="flex items-center gap-1 uppercase tracking-wider font-semibold">
                            <Clock size={12} />
                            {iv.status === "IN_PROGRESS" ? "In Progress" : "Completed"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        {isCompleted && iv.report ? (
                          <div className="text-right">
                            <span className="text-xs text-slate-500 block">Overall Score</span>
                            <span className="font-extrabold text-lg text-teal-400">
                              {iv.report.overallScore}/100
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-500 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-lg">
                            Incomplete
                          </span>
                        )}

                        {isCompleted ? (
                          <Link
                            href={`/report/${iv.id}`}
                            className="bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-1 transition-colors"
                          >
                            View Report
                            <ArrowRight size={12} />
                          </Link>
                        ) : (
                          <Link
                            href={`/interview/${iv.id}`}
                            className="bg-violet-950/20 border border-violet-500/20 hover:bg-violet-900/10 text-violet-400 text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-1 transition-colors"
                          >
                            Resume
                            <Play size={12} className="fill-current" />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
