"use client";

import { motion } from "framer-motion";
import { ArrowLeft, RefreshCw, Zap } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ServiceCard } from "@/components/connections/ServiceCard";
import { Button } from "@/components/ui/button";
import {
  disconnectService,
  fetchConnections,
  initiateConnection,
  type Connection,
} from "@/lib/api";

const SERVICE_CATALOG = [
  { app: "gmail", icon: "✉️", name: "Gmail", description: "Read, search, and send emails" },
  { app: "googlecalendar", icon: "📅", name: "Google Calendar", description: "View and create calendar events" },
  { app: "notion", icon: "📝", name: "Notion", description: "Search and create Notion pages" },
  { app: "slack", icon: "💬", name: "Slack", description: "Send messages and browse channels" },
  { app: "discord", icon: "🎮", name: "Discord", description: "Read and send Discord messages" },
  { app: "zoom", icon: "📹", name: "Zoom", description: "View and create Zoom meetings" },
];

/** Full-page connection management screen. */
export default function ConnectionsPage() {
  const { data: session, status } = useSession({ required: true });
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = session?.user?.id ?? "";

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchConnections(userId);
      setConnections(data.connections);
    } catch {
      setError("Could not load connections. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleConnect = async (appName: string) => {
    if (!userId) return;
    const url = await initiateConnection(userId, appName);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => void refresh(), 3000);
  };

  const handleDisconnect = async (appName: string) => {
    if (!userId) return;
    await disconnectService(userId, appName);
    await refresh();
  };

  const getConnection = (app: string) =>
    connections.find((c) => c.app.toLowerCase() === app);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050508]">
        <span className="text-sm text-slate-500">Loading…</span>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#050508]">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-64 -top-64 h-[500px] w-[500px] rounded-full bg-indigo-950/50 blur-3xl" />
        <div className="absolute -bottom-64 -right-64 h-[500px] w-[500px] rounded-full bg-violet-950/30 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl px-6 py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-10"
        >
          <Link href="/chat">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600/25 border border-indigo-500/35">
              <Zap className="h-4 w-4 text-indigo-400" />
            </div>
            <h1 className="gradient-text text-xl font-semibold">Manage Connections</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void refresh()}
            disabled={loading}
            className="ml-auto"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </motion.div>

        {/* Error banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 rounded-xl border border-amber-900/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-300"
          >
            {error}
          </motion.div>
        )}

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-sm text-slate-500 mb-6"
        >
          Connect your services to let Omni Copilot access your data.
          Connections are scoped per account — your data is never shared.
        </motion.p>

        {/* Service grid */}
        <div className="space-y-3">
          {SERVICE_CATALOG.map((svc, i) => {
            const conn = getConnection(svc.app);
            return (
              <motion.div
                key={svc.app}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.35 }}
              >
                <ServiceCard
                  name={svc.name}
                  description={svc.description}
                  icon={svc.icon}
                  connected={conn?.connected ?? false}
                  status={conn?.status ?? "NOT CONNECTED"}
                  onConnect={() => handleConnect(svc.app)}
                  onDisconnect={() => handleDisconnect(svc.app)}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
