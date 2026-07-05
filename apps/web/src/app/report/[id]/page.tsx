"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, ArrowLeft, CheckCircle, ChevronDown, ChevronUp, AlertCircle, Award, Target, MessageSquare } from "lucide-react";
import Link from "next/link";

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: interviewId } = React.use(params);
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchReport();
    }
  }, [status]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/interview/${interviewId}/report`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to load report");

      setReport(data.report);
      // Auto expand the first question
      const questions = data.report?.interview?.questions || [];
      if (questions.length > 0) {
        setExpandedQuestionId(questions[0].id);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-slate-950 text-slate-400">
        <Loader2 size={36} className="animate-spin text-violet-500 mb-4" />
        <p>Analyzing responses and loading report...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-slate-950 text-slate-400 p-6 text-center">
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl p-8 max-w-md">
          <h3 className="font-bold text-lg mb-2">Error Loading Report</h3>
          <p className="text-sm mb-6">{error || "Report is not generated yet. Complete the interview to generate your scorecard."}</p>
          <Link
            href="/dashboard"
            className="px-6 py-2.5 inline-block rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-sm font-semibold hover:border-slate-700 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Parse JSON columns
  const strengths = JSON.parse(report.strengths || "[]");
  const weaknesses = JSON.parse(report.weaknesses || "[]");
  const suggestions = JSON.parse(report.suggestions || "[]");
  const interviewData = report.interview;
  const questions = interviewData.questions || [];

  const toggleExpand = (qId: string) => {
    setExpandedQuestionId(expandedQuestionId === qId ? null : qId);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-teal-400 border-teal-500/20 bg-teal-500/5";
    if (score >= 60) return "text-amber-400 border-amber-500/20 bg-amber-500/5";
    return "text-rose-400 border-rose-500/20 bg-rose-500/5";
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 min-h-full">
      {/* Decorative Blur BG */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[600px] h-[600px] rounded-full bg-teal-500/5 blur-[120px] pointer-events-none" />

      {/* Header bar */}
      <header className="w-full border-b border-slate-900 bg-slate-950/60 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10">
        <Link
          href="/dashboard"
          className="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft size={16} />
          Dashboard
        </Link>
        <span className="text-sm font-semibold text-slate-350">
          Interview Assessment Report
        </span>
        <div className="w-20" /> {/* Spacer to center title */}
      </header>

      {/* Workspace */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 space-y-8 z-10">
        
        {/* Title Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Mock Interview Scorecard
            </h1>
            <p className="text-slate-400 text-sm">
              Target Role: <span className="text-slate-250 font-medium">{interviewData.targetRole}</span> &bull; Taken on {new Date(report.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className={`px-5 py-3 rounded-2xl border ${getScoreColor(report.overallScore)} flex items-center gap-3 shadow-xl`}>
            <Award size={24} />
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold opacity-70 block">Overall Score</span>
              <span className="text-2xl font-black">{report.overallScore}/100</span>
            </div>
          </div>
        </div>

        {/* Categories Scores */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Technical Skills", val: report.technicalScore },
            { label: "Communication", val: report.communicationScore },
            { label: "Project Depth", val: report.projectScore },
            { label: "Behavioral/HR", val: report.hrScore },
          ].map((cat, idx) => (
            <div key={idx} className="bg-slate-900/40 border border-slate-850/80 rounded-xl p-5 backdrop-blur-sm shadow-md">
              <span className="text-xs text-slate-400 font-semibold block mb-2">{cat.label}</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-white">{cat.val}</span>
                <span className="text-xs text-slate-500">/100</span>
              </div>
              <div className="w-full bg-slate-950 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-indigo-500"
                  style={{ width: `${cat.val}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Assessment Breakdown (Strengths / Weaknesses / Suggestions) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Strengths */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
              <CheckCircle size={16} /> Key Strengths
            </h3>
            <ul className="space-y-3">
              {strengths.map((str: string, index: number) => (
                <li key={index} className="text-slate-300 text-sm leading-relaxed flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-teal-500 rounded-full mt-2 shrink-0" />
                  {str}
                </li>
              ))}
            </ul>
          </div>

          {/* Weaknesses */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
              <AlertCircle size={16} /> Areas to Improve
            </h3>
            <ul className="space-y-3">
              {weaknesses.map((wk: string, index: number) => (
                <li key={index} className="text-slate-300 text-sm leading-relaxed flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full mt-2 shrink-0" />
                  {wk}
                </li>
              ))}
            </ul>
          </div>

          {/* Suggestions */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-violet-400 flex items-center gap-2">
              <Target size={16} /> Roadmap Suggestions
            </h3>
            <ul className="space-y-3">
              {suggestions.map((sg: string, index: number) => (
                <li key={index} className="text-slate-300 text-sm leading-relaxed flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-violet-500 rounded-full mt-2 shrink-0" />
                  {sg}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Detailed Question breakdown */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare size={18} className="text-slate-500" />
            Detailed Question Breakdown
          </h3>

          <div className="space-y-3">
            {questions.map((q: any, index: number) => {
              const hasResponse = !!q.response;
              const resp = q.response || {};
              const isExpanded = expandedQuestionId === q.id;

              return (
                <div
                  key={q.id}
                  className="bg-slate-900/20 border border-slate-850 rounded-xl overflow-hidden shadow-sm"
                >
                  {/* Collapsible Header */}
                  <div
                    onClick={() => toggleExpand(q.id)}
                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-900/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 pr-4">
                      <span className="text-xs font-bold text-slate-500 w-6 shrink-0">
                        {index + 1}
                      </span>
                      <div className="bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-[10px] uppercase font-bold text-slate-400 shrink-0">
                        {q.category}
                      </div>
                      <h4 className="font-bold text-sm text-slate-200 truncate max-w-lg md:max-w-xl">
                        {q.text}
                      </h4>
                    </div>

                    <div className="flex items-center gap-4">
                      {hasResponse ? (
                        <span className="text-xs font-semibold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded">
                          Scored: {resp.accuracyScore || 0}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                          Unanswered
                        </span>
                      )}
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {/* Collapsible Details */}
                  {isExpanded && (
                    <div className="border-t border-slate-850 p-6 bg-slate-950/40 space-y-5 text-sm">
                      {hasResponse ? (
                        <>
                          {/* Transcribed Answer */}
                          <div className="space-y-1.5">
                            <span className="text-xs uppercase font-bold tracking-wider text-slate-500">Transcribed Answer</span>
                            <p className="text-slate-300 italic leading-relaxed bg-slate-950 border border-slate-900 p-4 rounded-xl">
                              &ldquo;{resp.transcript}&rdquo;
                            </p>
                          </div>

                          {/* Dimensions Scores */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                              { label: "Accuracy", score: resp.accuracyScore },
                              { label: "Clarity", score: resp.clarityScore },
                              { label: "Completeness", score: resp.completenessScore },
                              { label: "Communication", score: resp.communicationScore },
                            ].map((dim, dIdx) => (
                              <div key={dIdx} className="bg-slate-950/60 p-3 rounded-lg border border-slate-900">
                                <span className="text-xs text-slate-500 font-medium block">{dim.label}</span>
                                <span className="text-base font-extrabold text-slate-200 mt-1 block">{dim.score}/100</span>
                              </div>
                            ))}
                          </div>

                          {/* Direct Feedback */}
                          <div className="space-y-1.5">
                            <span className="text-xs uppercase font-bold tracking-wider text-slate-500">LLM Evaluation & suggestions</span>
                            <p className="text-slate-350 leading-relaxed bg-slate-900/10 border border-slate-900 p-4 rounded-xl">
                              {resp.feedback}
                            </p>
                          </div>
                        </>
                      ) : (
                        <p className="text-slate-500 italic text-center py-4">
                          No answer was captured for this question.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
