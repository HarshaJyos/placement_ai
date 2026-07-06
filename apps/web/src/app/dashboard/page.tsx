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
      <div className="flex-1 flex flex-col justify-center items-center bg-background text-muted">
        <Loader2 size={36} className="animate-spin text-primary mb-4" />
        <p className="font-semibold text-sm">Loading your placement dashboard...</p>
      </div>
    );
  }

  const latestResume = profile?.resumes?.[0];
  const resumeScore = latestResume?.score || 0;
  const githubProfile = profile?.githubUrl?.split("/").pop() || "Not Connected";

  return (
    <div className="flex-1 flex flex-col bg-background text-main min-h-full">
      {/* Glow Backdrops */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />

      {/* Header bar */}
      <header className="w-full border-b border-border bg-white/80 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <img src="/logo.webp" alt="PlacementAI Logo" className="h-10 w-auto object-contain" />
          <span className="font-bold text-lg text-primary tracking-tight">PlacementAI</span>
        </div>
        <div className="flex items-center gap-4">
          {profile?.role === "ADMIN" && (
            <Link
              href="/admin"
              className="text-primary hover:text-primary/90 text-xs font-bold transition-colors border border-primary/20 px-3 py-1.5 rounded-lg bg-primary/5"
            >
              Admin View
            </Link>
          )}
          <div className="flex items-center gap-2 text-sm text-main border-r border-border pr-4">
            <User size={16} className="text-muted" />
            <span className="font-bold">{profile?.fullName}</span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-muted hover:text-main transition-colors flex items-center gap-1.5 text-sm font-semibold cursor-pointer"
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
          <div className="bg-white border border-border rounded-2xl p-6 shadow-md space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/5 text-primary flex items-center justify-center text-xl font-black mb-4 border border-primary/10">
                {profile?.fullName ? profile.fullName.split(" ").map((n: string) => n[0]).join("") : ""}
              </div>
              <h3 className="font-bold text-lg text-main">{profile?.fullName}</h3>
              <p className="text-xs text-muted mt-1 uppercase font-bold tracking-wider">
                {profile?.preferredRole}
              </p>
            </div>

            <div className="border-t border-border pt-5 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted flex items-center gap-2 font-medium">
                  <FileText size={16} /> Resume Score
                </span>
                <span className="font-extrabold text-primary">{resumeScore}/100</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted flex items-center gap-2 font-medium">
                  <Github size={16} /> GitHub
                </span>
                <span className="font-bold text-primary text-xs truncate max-w-[120px]" title={githubProfile}>
                  {githubProfile}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted flex items-center gap-2 font-medium">
                  <Award size={16} /> Branch
                </span>
                <span className="font-bold text-main text-xs text-right max-w-[120px] truncate">
                  {profile?.branch || "N/A"}
                </span>
              </div>
            </div>

            <Link
              href="/onboarding"
              className="block text-center text-xs text-accent hover:text-accent/90 font-bold transition-colors mt-4"
            >
              Edit Profile details
            </Link>
          </div>
        </div>

        {/* Right Dashboard Area */}
        <div className="lg:col-span-3 space-y-8">
          
          {/* Action Row */}
          <div className="bg-primary/5 border border-primary/10 rounded-2xl p-8 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <h2 className="text-2xl font-black text-primary">Start a Mock Interview</h2>
              <p className="text-muted text-sm font-medium max-w-md">
                Launch a 15-question customized interview based on your current resume and GitHub repositories.
              </p>
            </div>
            
            <button
              onClick={handleStartInterview}
              disabled={startLoading}
              className="bg-accent hover:bg-accent/90 text-white font-bold px-6 py-4 rounded-xl shadow-lg shadow-accent/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 min-w-[200px] cursor-pointer"
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
            <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/15 text-rose-600 text-sm text-center font-medium">
              {error}
            </div>
          )}

          {/* Past Interviews List */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-main flex items-center gap-2">
              <ClipboardList size={18} className="text-muted" />
              Past Interviews
            </h3>

            {interviews.length === 0 ? (
              <div className="border border-border rounded-2xl p-12 text-center text-muted font-medium bg-white shadow-sm">
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
                      className="bg-white border border-border rounded-xl p-5 flex items-center justify-between hover:border-primary/40 hover:shadow-sm transition-all"
                    >
                      <div className="space-y-1.5">
                        <h4 className="font-bold text-sm text-main">
                          Mock Interview — {iv.targetRole}
                        </h4>
                        <div className="flex items-center gap-4 text-xs text-muted font-medium">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {dateStr}
                          </span>
                          <span className="flex items-center gap-1 uppercase tracking-wider font-bold">
                            <Clock size={12} />
                            {iv.status === "IN_PROGRESS" ? "In Progress" : "Completed"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        {isCompleted && iv.report ? (
                          <div className="text-right">
                            <span className="text-xs text-muted block font-medium">Overall Score</span>
                            <span className="font-black text-lg text-primary">
                              {iv.report.overallScore}/100
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 font-bold bg-amber-500/5 border border-amber-500/15 px-2.5 py-1 rounded-lg">
                            Incomplete
                          </span>
                        )}

                        {isCompleted ? (
                          <Link
                            href={`/report/${iv.id}`}
                            className="bg-primary hover:bg-primary/90 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1 transition-colors"
                          >
                            View Report
                            <ArrowRight size={12} />
                          </Link>
                        ) : (
                          <Link
                            href={`/interview/${iv.id}`}
                            className="bg-accent hover:bg-accent/90 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1 transition-colors"
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
