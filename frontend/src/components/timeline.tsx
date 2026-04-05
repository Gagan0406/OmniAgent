"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Sparkles, Plug, MessageSquare, Rocket } from "lucide-react";

const STEPS = [
  {
    id: 1,
    icon: Plug,
    title: "Connect Your Apps",
    description:
      "Link Gmail, Google Calendar, Slack, Drive, Meet, and Notion in one click via secure OAuth. Omni never stores your credentials.",
    detail: "Connecting to Gmail · Calendar · Slack · Drive…",
  },
  {
    id: 2,
    icon: MessageSquare,
    title: "Ask in Plain English",
    description:
      'Type naturally — "Schedule a 3pm meeting with the design team and send them the brief from my Drive." No prompt engineering needed.',
    detail: "Understanding intent · Routing to agents…",
  },
  {
    id: 3,
    icon: Rocket,
    title: "Omni Handles the Rest",
    description:
      "Your personal AI dispatches specialized sub-agents that coordinate across all your connected apps simultaneously — in seconds.",
    detail: "Executing across 3 apps · Done ✓",
  },
];

type Status = "pending" | "active" | "completed";

export function Timeline() {
  const [statuses, setStatuses] = useState<Status[]>(["active", "pending", "pending"]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setStatuses(["completed", "active", "pending"]);
    }, 2200);

    const t2 = setTimeout(() => {
      setStatuses(["completed", "completed", "active"]);
    }, 4400);

    const t3 = setTimeout(() => {
      setStatuses(["completed", "completed", "completed"]);
      setDone(true);
    }, 6600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const activeIdx = statuses.findIndex((s) => s === "active");
  const lineProgress = done ? 100 : activeIdx <= 0 ? 0 : (activeIdx / (STEPS.length - 1)) * 100;

  return (
    <section className="w-full bg-black py-24 px-6">
      {/* Header */}
      <div className="max-w-5xl mx-auto text-center mb-20">
        <p className="text-indigo-400 text-sm font-semibold uppercase tracking-widest mb-3">
          How It Works
        </p>
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
          From idea to{" "}
          <span className="gradient-text">done in seconds</span>
        </h2>
        <p className="text-slate-400 text-lg max-w-xl mx-auto">
          Three simple steps. Zero context switching. One AI that does it all.
        </p>
      </div>

      {/* Timeline */}
      <div className="max-w-2xl mx-auto relative">
        {/* Track line */}
        <div className="absolute left-6 top-6 bottom-6 w-px bg-white/8" />

        {/* Animated progress line */}
        <motion.div
          className="absolute left-6 top-6 w-px bg-indigo-500 origin-top"
          animate={{ height: `${lineProgress}%` }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        />

        <div className="space-y-6">
          {STEPS.map((step, idx) => {
            const status = statuses[idx];
            const Icon = step.icon;
            const isActive = status === "active";
            const isCompleted = status === "completed";
            const isPending = status === "pending";

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -32 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: idx * 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="relative flex items-start gap-6"
              >
                {/* Step icon */}
                <div className="relative z-10 flex-shrink-0">
                  {isCompleted && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 18 }}
                      className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center shadow-[0_0_24px_rgba(99,102,241,0.5)]"
                    >
                      <CheckCircle2 className="w-6 h-6 text-white" />
                    </motion.div>
                  )}

                  {isActive && (
                    <motion.div
                      className="relative"
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.6)] relative z-10">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <motion.div
                        className="absolute inset-0 rounded-full bg-indigo-500"
                        animate={{ scale: [1, 1.7], opacity: [0.4, 0] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                      />
                      <motion.div
                        className="absolute -top-1 -right-1"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      >
                        <Sparkles className="w-4 h-4 text-indigo-300" />
                      </motion.div>
                    </motion.div>
                  )}

                  {isPending && (
                    <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 text-sm font-semibold">
                      {step.id}
                    </div>
                  )}
                </div>

                {/* Card */}
                <motion.div
                  className="flex-1 pb-6 last:pb-0"
                  whileHover={{ scale: 1.015 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div
                    className={`rounded-2xl border p-6 transition-all duration-500 ${
                      isActive
                        ? "border-indigo-500/50 bg-indigo-600/10 shadow-[0_0_40px_rgba(99,102,241,0.12)]"
                        : isCompleted
                        ? "border-indigo-500/25 bg-white/[0.02]"
                        : "border-white/6 bg-white/[0.01] opacity-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`text-lg font-semibold ${isPending ? "text-slate-500" : "text-white"}`}>
                        {step.title}
                      </h3>
                      <span
                        className={`text-[11px] px-3 py-1 rounded-full font-medium ${
                          isCompleted
                            ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/30"
                            : isActive
                            ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                            : "bg-white/5 text-slate-500 border border-white/8"
                        }`}
                      >
                        {isCompleted ? "Completed" : isActive ? "In Progress" : "Pending"}
                      </span>
                    </div>

                    <p className="text-slate-400 text-sm leading-relaxed">{step.description}</p>

                    {/* Progress bar */}
                    <div className="mt-4 h-1 rounded-full bg-white/5 overflow-hidden">
                      {isActive && (
                        <motion.div
                          className="h-full bg-gradient-to-r from-indigo-500 via-violet-400 to-indigo-500 rounded-full"
                          animate={{ x: ["-100%", "200%"] }}
                          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                          style={{ width: "50%" }}
                        />
                      )}
                      {isCompleted && (
                        <motion.div
                          className="h-full bg-indigo-500/70 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 0.6 }}
                        />
                      )}
                    </div>

                    {isActive && (
                      <motion.p
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 text-[11px] text-indigo-400/70 font-mono"
                      >
                        {step.detail}
                      </motion.p>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Completion card — inside same layout flow, offset past the icon column */}
        {done && (
          <motion.div
            initial={{ opacity: 0, x: -32, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="relative flex items-start gap-6 mt-0"
          >
            {/* Icon placeholder — aligns with step icons */}
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center shadow-[0_0_28px_rgba(99,102,241,0.6)] z-10">
              <Sparkles className="w-5 h-5 text-white" />
            </div>

            {/* Card */}
            <div className="flex-1">
              <div className="rounded-2xl border border-indigo-500/40 bg-indigo-600/10 p-6 shadow-[0_0_50px_rgba(99,102,241,0.12)]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-white">Mission Accomplished</h3>
                  <span className="text-[11px] px-3 py-1 rounded-full font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    ✓ Done
                  </span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Omni Copilot has finished coordinating across your connected apps. Check your inbox, calendar, and workspace — everything's taken care of.
                </p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-3 text-[11px] text-emerald-400/70 font-mono"
                >
                  3 apps updated · 0 errors · 0 manual steps 🎉
                </motion.p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
