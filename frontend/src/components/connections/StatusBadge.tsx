"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  connected: boolean;
  className?: string;
}

/** Pulsing dot badge indicating connection status. */
export function StatusBadge({ connected, className }: StatusBadgeProps) {
  return (
    <span className={cn("relative flex h-2.5 w-2.5", className)}>
      {connected && (
        <motion.span
          className="absolute inline-flex h-full w-full rounded-full bg-emerald-400"
          animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <span
        className={cn(
          "relative inline-flex h-2.5 w-2.5 rounded-full",
          connected ? "bg-emerald-400" : "bg-slate-600",
        )}
      />
    </span>
  );
}
