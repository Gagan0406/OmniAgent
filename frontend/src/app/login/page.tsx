"use client";

import { motion } from "framer-motion";
import { Chrome, Zap } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Login page — Google OAuth or dev credentials. */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [devLoading, setDevLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl: "/chat" });
  };

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setDevLoading(true);
    await signIn("dev-credentials", { email: email.trim(), callbackUrl: "/chat" });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#050508]">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-64 -top-64 h-[600px] w-[600px] rounded-full bg-indigo-950/60 blur-3xl" />
        <div className="absolute -bottom-64 -right-64 h-[600px] w-[600px] rounded-full bg-violet-950/40 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-sm px-6"
      >
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/25 border border-indigo-500/35">
            <Zap className="h-6 w-6 text-indigo-400" />
          </div>
          <div className="text-center">
            <h1 className="gradient-text text-2xl font-semibold">Omni Copilot</h1>
            <p className="mt-1 text-sm text-slate-500">Sign in to continue</p>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border border-white/8 p-6 space-y-4"
          style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)" }}
        >
          {/* Google */}
          <Button
            className="w-full gap-2"
            onClick={handleGoogle}
            disabled={googleLoading || devLoading}
          >
            <Chrome className="h-4 w-4" />
            {googleLoading ? "Redirecting…" : "Continue with Google"}
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/8" />
            <span className="text-xs text-slate-600">or dev login</span>
            <div className="h-px flex-1 bg-white/8" />
          </div>

          {/* Dev credentials */}
          <form onSubmit={handleDevLogin} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-white/8 bg-white/4 px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-all"
              disabled={devLoading || googleLoading}
            />
            <Button
              type="submit"
              variant="outline"
              className="w-full"
              disabled={!email.trim() || devLoading || googleLoading}
            >
              {devLoading ? "Signing in…" : "Sign in (dev)"}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-slate-700">
          Dev login creates a session without a password — for local development only.
        </p>
      </motion.div>
    </div>
  );
}
