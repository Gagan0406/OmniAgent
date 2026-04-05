"use client";

import { motion } from "framer-motion";
import { Loader2, Plug, Unplug } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

interface ServiceCardProps {
  name: string;
  description: string;
  icon: string;
  connected: boolean;
  status: string;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
}

/** Full-width card for managing a single service connection. Lifts on hover. */
export function ServiceCard({
  name,
  description,
  icon,
  connected,
  status,
  onConnect,
  onDisconnect,
}: ServiceCardProps) {
  const [busy, setBusy] = useState(false);

  const handle = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{
        y: -4,
        scale: 1.01,
        transition: { duration: 0.3, ease: "easeOut" },
      }}
      className={cn(
        "group relative overflow-hidden flex items-center justify-between p-5 rounded-3xl border transition-all duration-500",
        connected
          ? "border-emerald-500/30 bg-emerald-950/20 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] hover:border-emerald-400/50"
          : "border-white/10 bg-white/5 hover:bg-neutral-900/80 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] hover:border-indigo-500/40"
      )}
      style={{ backdropFilter: "blur(20px)" }}
    >
      {/* Background ambient glow matching bg-black */}
      <div
        className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none",
          connected
            ? "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent"
            : "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent"
        )}
      />

      <div className="relative flex items-center gap-4 w-full justify-between z-10">
        <div className="flex items-center gap-4 min-w-0 max-w-[70%]">
          {/* Icon Container */}
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-white/5 to-white/10 text-2xl shadow-inner shadow-white/5 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-300">
            {icon}
            {/* Ping dot for connected state */}
            {connected && (
              <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-emerald-950" />
              </span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <span className="block text-base text-white tracking-wide font-semibold truncate">
                {name}
              </span>
              <StatusBadge connected={connected} />
            </div>
            <span className="block text-sm text-slate-400 font-light mt-0.5 truncate group-hover:text-slate-300 transition-colors">
              {description}
            </span>
            <span className="block text-[10px] font-mono text-slate-500 mt-1 uppercase tracking-widest opacity-60">
              {status}
            </span>
          </div>
        </div>

        {/* Action Button */}
        {connected ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handle(onDisconnect)}
            disabled={busy}
            className="shrink-0 rounded-xl px-4 py-2 bg-transparent text-rose-400 font-medium tracking-tight border border-rose-900/50 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-500/50 transition-all duration-300"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Unplug className="h-4 w-4 mr-2" />
            )}
            <span>Manage</span>
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => handle(onConnect)}
            disabled={busy}
            className="shrink-0 rounded-xl px-5 py-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-500 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/20 transition-all duration-300"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plug className="h-4 w-4 mr-2" />
            )}
            <span>Connect</span>
          </Button>
        )}
      </div>
    </motion.div>
  );
}
