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
    <div className="bg-white border border-border rounded-2xl p-8 shadow-lg shadow-primary/5">
      {success && (
        <div className="mb-6 p-4 rounded-xl bg-teal-500/5 border border-teal-500/15 text-teal-600 text-sm text-center font-medium">
          {success}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/5 border border-rose-500/15 text-rose-600 text-sm text-center font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-main uppercase tracking-wider mb-2">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
              <Mail size={18} />
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-border rounded-xl py-3 pl-10 pr-4 text-main placeholder-muted/60 focus:outline-none focus:border-primary transition-colors text-sm"
              placeholder="you@college.edu"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-main uppercase tracking-wider mb-2">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
              <Lock size={18} />
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-border rounded-xl py-3 pl-10 pr-4 text-main placeholder-muted/60 focus:outline-none focus:border-primary transition-colors text-sm"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 relative group overflow-hidden rounded-xl bg-accent hover:bg-accent/90 py-3.5 px-4 text-sm font-bold text-white shadow-md shadow-accent/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
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

      <div className="mt-8 text-center text-xs text-muted">
        Don't have an account?{" "}
        <Link href="/register" className="text-primary hover:text-primary/95 transition-colors font-bold">
          Create Account
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 relative overflow-hidden bg-background">
      {/* Decorative Background Gradients */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <img src="/logo.webp" alt="PlacementAI Logo" className="h-16 w-auto mx-auto object-contain mb-4" />
          <h1 className="text-3xl font-extrabold tracking-tight text-primary mb-2">
            Welcome Back
          </h1>
          <p className="text-muted text-sm font-medium">
            Sign in to access your dashboard and mock interviews
          </p>
        </div>

        <Suspense fallback={
          <div className="bg-white border border-border rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px] shadow-lg">
            <Loader2 size={36} className="animate-spin text-primary mb-4" />
            <p className="text-sm text-muted">Loading login panel...</p>
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
