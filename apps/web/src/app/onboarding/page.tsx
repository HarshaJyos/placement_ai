"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Upload, Briefcase, FileText, CheckCircle, Loader2, Sparkles, GraduationCap, ArrowRight } from "lucide-react";
import { Github } from "@/components/icons";

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Steps state
  const [step, setStep] = useState(1);

  // Resume state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeData, setResumeData] = useState<any>(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);

  // GitHub state
  const [githubUsername, setGithubUsername] = useState("");
  const [githubData, setGithubData] = useState<any>(null);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);

  // Education & Role details
  const [preferredRole, setPreferredRole] = useState("Fullstack Engineer");
  const [college, setCollege] = useState("");
  const [degree, setDegree] = useState("");
  const [branch, setBranch] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [onboardError, setOnboardError] = useState<string | null>(null);

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  // Handle Resume Upload
  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0]);
      setResumeError(null);
    }
  };

  const uploadResume = async () => {
    if (!resumeFile) return;
    setResumeLoading(true);
    setResumeError(null);

    const formData = new FormData();
    formData.append("file", resumeFile);

    try {
      const res = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse resume");

      setResumeData(data.resume);
      // Automatically advance step after success
      setStep(2);
    } catch (err: any) {
      setResumeError(err.message || "An error occurred");
    } finally {
      setResumeLoading(false);
    }
  };

  // Handle GitHub Analysis
  const analyzeGitHub = async () => {
    if (!githubUsername) return;
    setGithubLoading(true);
    setGithubError(null);

    try {
      const res = await fetch("/api/github/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: githubUsername }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to analyze GitHub profile");

      setGithubData(data.profile);
    } catch (err: any) {
      setGithubError(err.message || "An error occurred");
    } finally {
      setGithubLoading(false);
    }
  };

  // Save All and Complete Onboarding
  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardLoading(true);
    setOnboardError(null);

    try {
      const res = await fetch("/api/user/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferredRole,
          college,
          degree,
          branch,
          gradYear: gradYear ? parseInt(gradYear) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save profile details");

      router.push("/dashboard");
    } catch (err: any) {
      setOnboardError(err.message || "An error occurred");
    } finally {
      setOnboardLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center py-12 px-4 relative overflow-hidden bg-slate-950">
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-teal-500/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-2xl z-10">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between mb-8 px-2">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-2 rounded-xl text-white">
              <Sparkles size={16} />
            </div>
            <h2 className="text-xl font-bold text-white">Setup Profile</h2>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 w-8 rounded-full transition-all duration-300 ${
                  step >= s ? "bg-gradient-to-r from-violet-500 to-indigo-500" : "bg-slate-800"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Upload Resume */}
        {step === 1 && (
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-2">Upload Your Resume</h3>
              <p className="text-slate-400 text-sm max-w-md mx-auto">
                We'll parse your skills, experiences, and project lists using LLMs to customize your technical questions.
              </p>
            </div>

            <div className="border-2 border-dashed border-slate-800 hover:border-violet-500/50 rounded-2xl p-8 text-center transition-colors relative cursor-pointer group bg-slate-950/20">
              <input
                type="file"
                accept=".pdf"
                onChange={handleResumeChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-3">
                <div className="bg-violet-500/10 text-violet-400 w-12 h-12 rounded-xl flex items-center justify-center border border-violet-500/10 group-hover:scale-105 transition-transform">
                  <Upload size={22} />
                </div>
                <div>
                  <p className="text-slate-200 font-semibold text-sm">
                    {resumeFile ? resumeFile.name : "Click or drag PDF resume here"}
                  </p>
                  <p className="text-slate-500 text-xs mt-1">PDF file size up to 10MB</p>
                </div>
              </div>
            </div>

            {resumeError && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm text-center">
                {resumeError}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 text-sm font-semibold hover:text-slate-200 transition-colors"
              >
                Skip For Now
              </button>
              <button
                type="button"
                disabled={!resumeFile || resumeLoading}
                onClick={uploadResume}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold flex items-center gap-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all"
              >
                {resumeLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Parsing Resume...
                  </>
                ) : (
                  <>
                    Parse & Next
                    <CheckCircle size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: GitHub Analysis */}
        {step === 2 && (
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-2">Connect GitHub</h3>
              <p className="text-slate-400 text-sm max-w-md mx-auto">
                Enter your username. We will extract complexity and frameworks from your projects to test you on them.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  GitHub Username
                </label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Github size={18} />
                    </div>
                    <input
                      type="text"
                      value={githubUsername}
                      onChange={(e) => setGithubUsername(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3.5 pl-10 pr-4 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-violet-500 transition-colors text-sm"
                      placeholder="e.g. torvalds"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={analyzeGitHub}
                    disabled={!githubUsername || githubLoading}
                    className="px-5 py-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-sm font-semibold flex items-center gap-2 disabled:opacity-50 transition-colors"
                  >
                    {githubLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      "Analyze"
                    )}
                  </button>
                </div>
              </div>

              {githubError && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm text-center">
                  {githubError}
                </div>
              )}

              {githubData && (
                <div className="p-4 rounded-xl bg-teal-500/5 border border-teal-500/15 text-teal-400 text-xs">
                  <div className="font-semibold mb-2 flex items-center gap-1.5 text-sm">
                    <CheckCircle size={16} /> Connected to GitHub profile!
                  </div>
                  <p>Analyzed repos: {githubData.summaryJson?.map((r: any) => r.repo).join(", ") || "None found."}</p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center mt-6">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-xl border border-slate-850 text-slate-500 hover:text-slate-300 text-sm font-semibold transition-colors"
              >
                Back
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 text-sm font-semibold transition-colors"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold transition-all active:scale-95"
                >
                  Next Step
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Education details and Preferred Role */}
        {step === 3 && (
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-2">Education & Job Target</h3>
              <p className="text-slate-400 text-sm max-w-md mx-auto">
                Set your target role so we can ask relevant technical questions, along with your college details for report tracking.
              </p>
            </div>

            <form onSubmit={handleCompleteOnboarding} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Target Role
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Briefcase size={18} />
                  </div>
                  <select
                    value={preferredRole}
                    onChange={(e) => setPreferredRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3.5 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-violet-500 transition-colors text-sm appearance-none"
                  >
                    <option>Frontend Engineer</option>
                    <option>Backend Engineer</option>
                    <option>Fullstack Engineer</option>
                    <option>Mobile App Developer</option>
                    <option>Data Scientist</option>
                    <option>DevOps Engineer</option>
                    <option>Product Manager</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    College Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <GraduationCap size={18} />
                    </div>
                    <input
                      type="text"
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors text-sm"
                      placeholder="Stanford University"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Degree
                  </label>
                  <input
                    type="text"
                    value={degree}
                    onChange={(e) => setDegree(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors text-sm"
                    placeholder="B.S. / B.Tech"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Branch / Major
                  </label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors text-sm"
                    placeholder="Computer Science"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Graduation Year
                  </label>
                  <input
                    type="number"
                    value={gradYear}
                    onChange={(e) => setGradYear(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors text-sm"
                    placeholder="2026"
                  />
                </div>
              </div>

              {onboardError && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm text-center">
                  {onboardError}
                </div>
              )}

              <div className="flex justify-between items-center mt-6 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 rounded-xl border border-slate-850 text-slate-500 hover:text-slate-300 text-sm font-semibold transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={onboardLoading}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold flex items-center gap-2 shadow-lg active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all"
                >
                  {onboardLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving Setup...
                    </>
                  ) : (
                    <>
                      Finish Onboarding
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
