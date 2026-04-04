"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bot } from "lucide-react";

/** Animated three-dot typing indicator shown while the AI is thinking. */
export function TypingIndicator() {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.94 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-end gap-3 px-4"
      >
        {/* Avatar with subtle pulse ring */}
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-indigo-400">
          <Bot className="h-4 w-4" />
          <span className="absolute inset-0 rounded-xl animate-ping bg-indigo-500/10" />
        </div>

        {/* Pill-shaped glass bubble */}
        <div className="rounded-full bg-black/40 backdrop-blur-xl border border-white/10 px-4 py-3">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="block h-1.5 w-1.5 rounded-full bg-indigo-400"
                animate={{ y: [0, -5, 0], opacity: [0.35, 1, 0.35] }}
                transition={{
                  duration: 0.75,
                  repeat: Infinity,
                  repeatType: "mirror",
                  delay: i * 0.17,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
