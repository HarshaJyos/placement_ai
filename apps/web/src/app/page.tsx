import React from "react";
import Link from "next/link";
import { Sparkles, Terminal, FileText, Mic, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-background">
      {/* Subtle brand color glow backdrops */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[600px] h-[600px] rounded-full bg-accent/5 blur-[130px] pointer-events-none" />

      {/* Header */}
      <header className="w-full border-b border-border bg-white/80 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <img src="/logo.webp" alt="PlacementAI Logo" className="h-10 w-auto object-contain" />
          <span className="font-bold text-xl text-primary tracking-tight">
            PlacementAI
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-muted hover:text-primary transition-colors text-sm font-semibold"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="bg-primary hover:bg-primary/90 transition-all text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-primary/10 active:scale-95"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 max-w-4xl mx-auto z-10 py-20">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-8">
          <Sparkles size={14} className="text-accent animate-pulse" />
          The Next-Gen Placement Preparation Tool
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-main mb-6 leading-tight">
          Ace Your Placements With
          <span className="block mt-2 bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary to-accent">
            AI-Powered Interviews
          </span>
        </h1>

        <p className="text-muted text-lg md:text-xl max-w-2xl mb-12 leading-relaxed">
          Upload your resume, connect your GitHub profile, and get customized voice-based mock interviews evaluated by advanced LLMs to identify your strengths and work on your weaknesses.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-sm mb-20">
          <Link
            href="/register"
            className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white font-bold px-6 py-4 rounded-xl shadow-lg shadow-accent/20 active:scale-95 transition-all text-base group"
          >
            Start Mock Interview
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full text-left">
          {/* Card 1 */}
          <div className="bg-white border border-border rounded-2xl p-7 shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-primary/5 text-primary w-12 h-12 rounded-xl flex items-center justify-center mb-5 border border-primary/10">
              <FileText size={22} />
            </div>
            <h3 className="text-main font-bold text-lg mb-2">Resume Parsing</h3>
            <p className="text-muted text-sm leading-relaxed">
              We extract skills, work experiences, and academic achievements from your PDF and rate them out of 100 with clear ways to improve.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white border border-border rounded-2xl p-7 shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-primary/5 text-primary w-12 h-12 rounded-xl flex items-center justify-center mb-5 border border-primary/10">
              <Terminal size={22} />
            </div>
            <h3 className="text-main font-bold text-lg mb-2">GitHub Analysis</h3>
            <p className="text-muted text-sm leading-relaxed">
              Our AI parses your projects and code repositories, assessing complexity, tech stacks, and features, generating highly technical interview topics.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white border border-border rounded-2xl p-7 shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-primary/5 text-primary w-12 h-12 rounded-xl flex items-center justify-center mb-5 border border-primary/10">
              <Mic size={22} />
            </div>
            <h3 className="text-main font-bold text-lg mb-2">Voice Interviews</h3>
            <p className="text-muted text-sm leading-relaxed">
              Experience dynamic voice responses evaluated for accuracy, technical clarity, and communication skills, followed by comprehensive reports.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border py-8 text-center text-muted text-xs mt-auto z-10 bg-white">
        &copy; {new Date().getFullYear()} PlacementAI. Built with Next.js, FastAPI & Google Gemini API.
      </footer>
    </div>
  );
}
