"use client";

import { motion } from "framer-motion";
import {
  Brain,
  Zap,
  ShieldCheck,
  GitMerge,
  BarChart2,
  MessageSquare,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Context-Aware AI",
    description:
      "Omni Copilot remembers your conversations, preferences, and work style — getting smarter with every interaction.",
    gradient: "from-indigo-500/20 to-violet-500/10",
    iconColor: "text-indigo-400",
    glow: "rgba(99,102,241,0.15)",
    size: "large", // spans 2 columns
  },
  {
    icon: Zap,
    title: "Instant Execution",
    description: "Send emails, schedule meetings, and update tasks — directly from the chat interface.",
    gradient: "from-amber-500/20 to-orange-500/10",
    iconColor: "text-amber-400",
    glow: "rgba(251,191,36,0.12)",
    size: "small",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise-Grade Security",
    description: "All integrations run with scoped OAuth. We never store your credentials.",
    gradient: "from-emerald-500/20 to-teal-500/10",
    iconColor: "text-emerald-400",
    glow: "rgba(52,211,153,0.12)",
    size: "small",
  },
  {
    icon: GitMerge,
    title: "Multi-Agent Orchestration",
    description: "Specialized sub-agents collaborate under the hood — research, code, write, and plan simultaneously.",
    gradient: "from-sky-500/20 to-blue-500/10",
    iconColor: "text-sky-400",
    glow: "rgba(56,189,248,0.12)",
    size: "small",
  },
  {
    icon: BarChart2,
    title: "Live Analytics",
    description: "Track your productivity metrics and see exactly how Omni Copilot is saving you time every week.",
    gradient: "from-pink-500/20 to-rose-500/10",
    iconColor: "text-pink-400",
    glow: "rgba(244,114,182,0.12)",
    size: "large",
  },
  {
    icon: MessageSquare,
    title: "Natural Language Interface",
    description: "No prompts to memorize. Just talk to it like a brilliant colleague who knows all your apps.",
    gradient: "from-violet-500/20 to-purple-500/10",
    iconColor: "text-violet-400",
    glow: "rgba(167,139,250,0.12)",
    size: "small",
  },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export function FeaturesGridSection() {
  return (
    <section className="w-full bg-black py-24 px-6">
      {/* Section header */}
      <div className="max-w-6xl mx-auto text-center mb-16">
        <p className="text-indigo-400 text-sm font-semibold uppercase tracking-widest mb-3">
          Why Omni Copilot
        </p>
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
          Everything you need,{" "}
          <span className="gradient-text">nothing you don&apos;t</span>
        </h2>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
          A single intelligent layer over all your tools — no context switching, no copy-pasting, no repeated explanations.
        </p>
      </div>

      {/* Bento grid */}
      <motion.div
        className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-fr"
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
      >
        {features.map((feature) => {
          const Icon = feature.icon;
          const isLarge = feature.size === "large";

          return (
            <motion.div
              key={feature.title}
              variants={cardVariants}
              className={`group relative rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden p-7 flex flex-col gap-4 transition-all duration-300 hover:border-white/20 ${
                isLarge ? "md:col-span-2" : "md:col-span-1"
              }`}
              style={{
                boxShadow: `inset 0 0 80px ${feature.glow}`,
              }}
            >
              {/* Gradient overlay */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-60 group-hover:opacity-100 transition-opacity duration-500`}
              />

              {/* Subtle grid lines */}
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              />

              {/* Content */}
              <div className="relative z-10 flex flex-col gap-4 h-full">
                <div
                  className={`w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center ${feature.iconColor} group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-xl mb-2">{feature.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
                </div>

                {isLarge && (
                  <div className="mt-auto">
                    <div className="flex gap-2 flex-wrap">
                      {["GPT-4o", "Claude", "Gemini", "Groq"].map((model) => (
                        <span
                          key={model}
                          className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400"
                        >
                          {model}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
