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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5 transition-colors duration-300",
        connected
          ? "border-emerald-500/20 bg-emerald-950/10"
          : "border-white/8 bg-white/3",
      )}
      style={{ backdropFilter: "blur(20px)" }}
    >
      {/* Gradient overlay */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-30 transition-opacity duration-300",
          connected
            ? "bg-gradient-to-br from-emerald-900/30 via-transparent to-transparent"
            : "bg-gradient-to-br from-indigo-950/30 via-transparent to-transparent",
        )}
      />

      <div className="relative flex items-center gap-4">
        {/* Icon */}
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/5 text-xl">
          {icon}
          {/* Ping dot for connected state */}
          {connected && (
            <span className="absolute -right-1 -top-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-slate-100 truncate">{name}</h3>
            <StatusBadge connected={connected} />
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{description}</p>
          <p className="text-xs text-slate-600 mt-0.5 capitalize">{status.toLowerCase()}</p>
        </div>

        {/* Action */}
        {connected ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handle(onDisconnect)}
            disabled={busy}
            className="shrink-0 text-rose-400 border-rose-900/40 hover:bg-rose-900/20 hover:text-rose-300"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Unplug className="h-3.5 w-3.5" />
            )}
            <span className="ml-1.5">Disconnect</span>
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => handle(onConnect)}
            disabled={busy}
            className="shrink-0"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plug className="h-3.5 w-3.5" />
            )}
            <span className="ml-1.5">Connect</span>
          </Button>
        )}
      </div>
    </motion.div>
  );
}
