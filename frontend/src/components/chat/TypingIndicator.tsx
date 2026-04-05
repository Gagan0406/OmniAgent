"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bot } from "lucide-react";

/** Animated shimmering block indicator shown while the AI is thinking. */
export function TypingIndicator() {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.98 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="flex items-end gap-3 px-4 mx-auto w-full max-w-4xl"
      >
        {/* Avatar with subtle pulse ring */}
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-indigo-500/30 bg-gradient-to-br from-indigo-950/80 to-slate-900 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
          <Bot className="h-4 w-4" />
          <span className="absolute inset-0 rounded-full animate-ping bg-indigo-500/20" />
        </div>

        {/* Processing shimmer */}
        <div className="flex items-center px-2 py-3 overflow-hidden rounded-xl">
           <motion.div 
             className="h-2 w-24 rounded-full bg-gradient-to-r from-indigo-500/10 via-indigo-400/50 to-indigo-500/10"
             animate={{ backgroundPosition: ["-100% 0", "200% 0"] }}
             transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
             style={{ backgroundSize: "200% 100%" }}
           />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
