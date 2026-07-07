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
      <div className="flex-1 flex flex-col justify-center items-center bg-background text-muted">
        <Loader2 size={36} className="animate-spin text-primary mb-4" />
        <p className="font-semibold text-sm">Loading admin control panel...</p>
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
    <div className="flex-1 flex flex-col bg-background text-main min-h-full">
      {/* Decorative circles */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      {/* Header bar */}
      <header className="w-full border-b border-border bg-white/80 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10 sticky top-0">
        <Link
          href="/dashboard"
          className="text-muted hover:text-main transition-colors flex items-center gap-1.5 text-sm font-bold cursor-pointer"
        >
          <ArrowLeft size={16} />
          Student View
        </Link>
        <div className="flex items-center gap-2 text-primary font-extrabold text-sm">
          <Shield size={16} className="text-primary" />
          <span>Admin Portal</span>
        </div>
        <div className="w-20" />
      </header>

      {/* Main workspace */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10 space-y-8 z-10">
        
        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">Placement Cell Panel</h1>
          <p className="text-muted text-sm font-medium">Track resume scores and mock interview performance across all registered students.</p>
        </div>

        {/* Aggregate Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-border rounded-2xl p-6 shadow-sm flex items-center gap-4">
            <div className="bg-primary/5 text-primary w-12 h-12 rounded-xl flex items-center justify-center border border-primary/10">
              <UserCheck size={22} />
            </div>
            <div>
              <span className="text-xs text-muted font-bold block mb-1">Total Students</span>
              <span className="text-2xl font-black text-main">{totalStudents}</span>
            </div>
          </div>

          <div className="bg-white border border-border rounded-2xl p-6 shadow-sm flex items-center gap-4">
            <div className="bg-accent/5 text-accent w-12 h-12 rounded-xl flex items-center justify-center border border-accent/10">
              <FileText size={22} />
            </div>
            <div>
              <span className="text-xs text-muted font-bold block mb-1">Avg Resume Score</span>
              <span className="text-2xl font-black text-main">{averageResumeScore}/100</span>
            </div>
          </div>

          <div className="bg-white border border-border rounded-2xl p-6 shadow-sm flex items-center gap-4">
            <div className="bg-primary/5 text-primary w-12 h-12 rounded-xl flex items-center justify-center border border-primary/10">
              <Award size={22} />
            </div>
            <div>
              <span className="text-xs text-muted font-bold block mb-1">Avg Mock Score</span>
              <span className="text-2xl font-black text-main">
                {averageInterviewScore > 0 ? `${averageInterviewScore}/100` : "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Filter controls row */}
        <div className="bg-white border border-border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-border rounded-lg py-2 pl-9 pr-4 text-main placeholder-muted/65 focus:outline-none focus:border-primary transition-colors text-xs"
              placeholder="Search by student name or email..."
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 w-full md:w-auto justify-end">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-muted" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-white border border-border text-main rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-primary"
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
              className="bg-white border border-border text-main rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-primary"
            >
              <option value="ALL">All Branches</option>
              {branchesList.map((branch: any) => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table view */}
        <div className="bg-white border border-border rounded-xl overflow-hidden shadow-md">
          {filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-muted font-semibold">No students matching the query filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted bg-slate-50 text-xs font-bold uppercase tracking-wider">
                    <th className="py-4 px-6">Student Name</th>
                    <th className="py-4 px-6">Target Role</th>
                    <th className="py-4 px-6">Resume Rating</th>
                    <th className="py-4 px-6">Completed Mock</th>
                    <th className="py-4 px-6">Avg Mock Rating</th>
                    <th className="py-4 px-6">Portfolio Links</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStudents.map((std) => (
                    <tr key={std.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-extrabold text-main text-sm">{std.fullName}</div>
                        <div className="text-xs text-muted font-semibold mt-0.5">{std.email}</div>
                      </td>
                      <td className="py-4 px-6 text-muted font-bold text-xs">
                        {std.preferredRole || "Not specified"}
                      </td>
                      <td className="py-4 px-6">
                        {std.resumeScore ? (
                          <span className="font-extrabold text-primary">{std.resumeScore}/100</span>
                        ) : (
                          <span className="text-muted italic text-xs font-semibold">No Upload</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-main text-xs font-bold">
                        {std.completedCount} interview(s)
                      </td>
                      <td className="py-4 px-6">
                        {std.averageInterviewScore ? (
                          <span className="font-black text-primary">{std.averageInterviewScore}/100</span>
                        ) : (
                          <span className="text-muted italic text-xs font-semibold">No Reports</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {std.githubUrl ? (
                          <a
                            href={std.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent/90 font-bold"
                          >
                            GitHub
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span className="text-muted text-xs italic font-semibold">N/A</span>
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

      {/* Footer */}
      <footer className="w-full border-t border-border py-6 text-center text-muted text-xs mt-auto z-10 bg-white/90 backdrop-blur-sm space-y-1 shrink-0">
        <p>&copy; {new Date().getFullYear()} PlacementAI. All Rights Reserved.</p>
        <p className="font-bold text-[10px] tracking-widest uppercase text-muted/80">
          Powered by <span className="text-primary font-black">Solvempire Private Limited</span>
        </p>
      </footer>
    </div>
  );
}
