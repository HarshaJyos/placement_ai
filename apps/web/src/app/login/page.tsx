"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Mail, Lock, Loader2, ArrowRight } from "lucide-react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setSuccess("Registration successful! Please log in below.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        throw new Error(res.error || "Invalid credentials");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 shadow-2xl shadow-violet-950/10">
      {success && (
        <div className="mb-6 p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 text-sm text-center font-medium">
          {success}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Mail size={18} />
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-violet-500 transition-colors text-sm"
              placeholder="you@college.edu"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Lock size={18} />
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-violet-500 transition-colors text-sm"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 relative group overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 px-4 text-sm font-semibold text-white shadow-lg hover:shadow-violet-500/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Logging In...
            </>
          ) : (
            <>
              Log In
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 text-center text-xs text-slate-500">
        Don't have an account?{" "}
        <Link href="/register" className="text-violet-400 hover:text-violet-300 transition-colors font-medium">
          Create Account
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 relative overflow-hidden bg-slate-950">
      {/* Decorative Background Gradients */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-teal-600/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-indigo-400 to-teal-400 mb-2">
            Welcome Back
          </h1>
          <p className="text-slate-400 text-sm">
            Sign in to access your dashboard and mock interviews
          </p>
        </div>

        <Suspense fallback={
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px]">
            <Loader2 size={36} className="animate-spin text-violet-500 mb-4" />
            <p className="text-sm text-slate-450">Loading login panel...</p>
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
