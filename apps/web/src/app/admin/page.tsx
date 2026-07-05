"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, ArrowLeft, Search, Filter, FileText, UserCheck, Shield, ExternalLink, Award } from "lucide-react";
import { Github } from "@/components/icons";
import Link from "next/link";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      // Check if user is admin
      const userRole = (session.user as any).role;
      if (userRole !== "ADMIN") {
        router.push("/dashboard");
      } else {
        fetchStudents();
      }
    }
  }, [status]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/students");
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to load students");

      setStudents(data.students || []);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-slate-950 text-slate-400">
        <Loader2 size={36} className="animate-spin text-teal-400 mb-4" />
        <p>Loading admin control panel...</p>
      </div>
    );
  }

  // Get distinct roles and branches for filters
  const rolesList = Array.from(new Set(students.map((s) => s.preferredRole).filter(Boolean)));
  const branchesList = Array.from(new Set(students.map((s) => s.branch).filter(Boolean)));

  // Filter students based on search query, role, and branch
  const filteredStudents = students.filter((std) => {
    const matchesSearch =
      std.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      std.email.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesRole = roleFilter === "ALL" || std.preferredRole === roleFilter;
    const matchesBranch = branchFilter === "ALL" || std.branch === branchFilter;

    return matchesSearch && matchesRole && matchesBranch;
  });

  // Calculate high-level stats
  const totalStudents = students.length;
  const averageResumeScore = totalStudents > 0
    ? Math.round(students.reduce((acc, curr) => acc + (curr.resumeScore || 0), 0) / totalStudents)
    : 0;
  const studentsWithInterviews = students.filter((s) => s.completedCount > 0);
  const averageInterviewScore = studentsWithInterviews.length > 0
    ? Math.round(studentsWithInterviews.reduce((acc, curr) => acc + (curr.averageInterviewScore || 0), 0) / studentsWithInterviews.length)
    : 0;

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 min-h-full">
      {/* Decorative circles */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-teal-500/5 blur-[120px] pointer-events-none" />

      {/* Header bar */}
      <header className="w-full border-b border-slate-900 bg-slate-950/60 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10">
        <Link
          href="/dashboard"
          className="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft size={16} />
          Student View
        </Link>
        <div className="flex items-center gap-2 font-bold text-slate-100 text-sm">
          <Shield size={16} className="text-teal-400" />
          <span>Admin Portal</span>
        </div>
        <div className="w-20" />
      </header>

      {/* Main workspace */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10 space-y-8 z-10">
        
        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Placement Cell Panel</h1>
          <p className="text-slate-400 text-sm">Track resume scores and mock interview performance across all registered students.</p>
        </div>

        {/* Aggregate Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 shadow-md flex items-center gap-4">
            <div className="bg-teal-500/10 text-teal-400 w-12 h-12 rounded-xl flex items-center justify-center border border-teal-500/10">
              <UserCheck size={22} />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-semibold block">Total Students</span>
              <span className="text-2xl font-black text-white">{totalStudents}</span>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 shadow-md flex items-center gap-4">
            <div className="bg-violet-500/10 text-violet-400 w-12 h-12 rounded-xl flex items-center justify-center border border-violet-500/10">
              <FileText size={22} />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-semibold block">Avg Resume Score</span>
              <span className="text-2xl font-black text-white">{averageResumeScore}/100</span>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 shadow-md flex items-center gap-4">
            <div className="bg-indigo-500/10 text-indigo-400 w-12 h-12 rounded-xl flex items-center justify-center border border-indigo-500/10">
              <Award size={22} />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-semibold block">Avg Mock Score</span>
              <span className="text-2xl font-black text-white">
                {averageInterviewScore > 0 ? `${averageInterviewScore}/100` : "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Filter controls row */}
        <div className="bg-slate-900/20 border border-slate-850 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 pr-4 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-teal-500 transition-colors text-xs"
              placeholder="Search by student name or email..."
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 w-full md:w-auto justify-end">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-500" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-300 text-xs focus:outline-none"
              >
                <option value="ALL">All Roles</option>
                {rolesList.map((role: any) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-300 text-xs focus:outline-none"
            >
              <option value="ALL">All Branches</option>
              {branchesList.map((branch: any) => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table view */}
        <div className="bg-slate-900/20 border border-slate-850 rounded-xl overflow-hidden shadow-xl">
          {filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No students matching the query filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-850 text-slate-400 bg-slate-900/30 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-4 px-6">Student Name</th>
                    <th className="py-4 px-6">Target Role</th>
                    <th className="py-4 px-6">Resume Rating</th>
                    <th className="py-4 px-6">Completed Mock</th>
                    <th className="py-4 px-6">Avg Mock Rating</th>
                    <th className="py-4 px-6">Portfolio Links</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {filteredStudents.map((std) => (
                    <tr key={std.id} className="hover:bg-slate-900/10 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-white text-sm">{std.fullName}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{std.email}</div>
                      </td>
                      <td className="py-4 px-6 text-slate-300 font-medium text-xs">
                        {std.preferredRole || "Not specified"}
                      </td>
                      <td className="py-4 px-6">
                        {std.resumeScore ? (
                          <span className="font-bold text-teal-400">{std.resumeScore}/100</span>
                        ) : (
                          <span className="text-slate-550 italic text-xs">No Upload</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-350 text-xs font-semibold">
                        {std.completedCount} interview(s)
                      </td>
                      <td className="py-4 px-6">
                        {std.averageInterviewScore ? (
                          <span className="font-extrabold text-teal-400">{std.averageInterviewScore}/100</span>
                        ) : (
                          <span className="text-slate-550 italic text-xs">No Reports</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {std.githubUrl ? (
                          <a
                            href={std.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 font-semibold"
                          >
                            GitHub
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span className="text-slate-600 text-xs italic">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
