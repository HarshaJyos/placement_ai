import React from "react";
import Link from "next/link";
import { Sparkles, Terminal, FileText, Mic, CheckCircle, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-950">
      {/* Glow effects */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[600px] h-[600px] rounded-full bg-teal-500/5 blur-[130px] pointer-events-none" />

      {/* Header */}
      <header className="w-full border-b border-slate-900 bg-slate-950/60 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2 font-bold text-lg text-slate-100">
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-violet-500/25">
            <Sparkles size={18} />
          </div>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
            PlacementAI
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-slate-400 hover:text-slate-200 transition-colors text-sm font-medium"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 transition-all text-slate-200 px-4 py-2 rounded-xl text-sm font-semibold shadow-md active:scale-95"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 max-w-4xl mx-auto z-10 py-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold uppercase tracking-wider mb-6">
          <Sparkles size={14} className="animate-pulse" />
          The Next-Gen Placement Preparation Tool
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          Ace Your Placements With
          <span className="block mt-2 bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-indigo-400 to-teal-400">
            AI-Powered Interviews
          </span>
        </h1>

        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed">
          Upload your resume, connect your GitHub profile, and get customized voice-based mock interviews evaluated by advanced LLMs to identify your strengths and work on your weaknesses.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-sm mb-16">
          <Link
            href="/register"
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold px-6 py-4 rounded-xl shadow-lg hover:shadow-violet-500/20 active:scale-95 transition-all text-base group"
          >
            Start Mock Interview
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          {/* Card 1 */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
            <div className="bg-violet-500/10 text-violet-400 w-12 h-12 rounded-xl flex items-center justify-center mb-4 border border-violet-500/10">
              <FileText size={22} />
            </div>
            <h3 className="text-white font-bold text-base mb-2">Resume Parsing</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              We extract skills, work experiences, and academic achievements from your PDF and rate them out of 100 with clear ways to improve.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
            <div className="bg-teal-500/10 text-teal-400 w-12 h-12 rounded-xl flex items-center justify-center mb-4 border border-teal-500/10">
              <Terminal size={22} />
            </div>
            <h3 className="text-white font-bold text-base mb-2">GitHub Analysis</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Our AI parses your projects and code repositories, assessing complexity, tech stacks, and features, generating highly technical interview topics.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
            <div className="bg-indigo-500/10 text-indigo-400 w-12 h-12 rounded-xl flex items-center justify-center mb-4 border border-indigo-500/10">
              <Mic size={22} />
            </div>
            <h3 className="text-white font-bold text-base mb-2">Voice Interviews</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Experience dynamic voice responses evaluated for accuracy, technical clarity, and communication skills, followed by comprehensive reports.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 py-6 text-center text-slate-500 text-xs mt-auto z-10 bg-slate-950">
        &copy; {new Date().getFullYear()} PlacementAI. Built with Next.js, FastAPI & Google Gemini API.
      </footer>
    </div>
  );
}
