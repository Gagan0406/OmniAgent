"use client";

import { motion } from "framer-motion";
import { ExternalLink, RefreshCw, Settings } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { disconnectService, fetchConnections, initiateConnection, type Connection } from "@/lib/api";
import { StatusBadge } from "./StatusBadge";

interface ServiceSidebarProps {
  userId: string;
}

const SERVICE_META: Record<string, { icon: string; label: string }> = {
  gmail: { icon: "✉️", label: "Gmail" },
  googlecalendar: { icon: "📅", label: "Calendar" },
  notion: { icon: "📝", label: "Notion" },
  slack: { icon: "💬", label: "Slack" },
  discord: { icon: "🎮", label: "Discord" },
  zoom: { icon: "📹", label: "Zoom" },
};

const KNOWN_SERVICES = Object.keys(SERVICE_META);

/**
 * Collapsible sidebar panel showing connected services.
 * Fetches real connection status from the backend.
 */
export function ServiceSidebar({ userId }: ServiceSidebarProps) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchConnections(userId);
      setConnections(data.connections);
    } catch {
      setConnections([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleConnect = async (appName: string) => {
    try {
      const url = await initiateConnection(userId, appName);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => void refresh(), 3000);
    } catch (e) {
      console.error("connect failed", e);
    }
  };

  const handleDisconnect = async (appName: string) => {
    await disconnectService(userId, appName);
    await refresh();
  };

  // Merge known services with fetched connection statuses
  const rows = KNOWN_SERVICES.map((app) => {
    const conn = connections.find((c) => c.app.toLowerCase() === app);
    return {
      app,
      connected: conn?.connected ?? false,
      status: conn?.status ?? "NOT CONNECTED",
    };
  });

  const connectedCount = rows.filter((r) => r.connected).length;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-300">
            Connections
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {connectedCount}/{rows.length} active
          </p>
        </div>
        <Button
          variant="default"
          size="icon"
          onClick={() => void refresh()}
          disabled={loading}
          title="Refresh"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Service rows */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1 pb-3">
        {rows.map((row, i) => {
          const meta = SERVICE_META[row.app]!;
          return (
            <motion.button
              key={row.app}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              onClick={() =>
                row.connected
                  ? void handleDisconnect(row.app)
                  : void handleConnect(row.app)
              }
              className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200 hover:bg-white/5 group"
              title={row.connected ? `Disconnect ${meta.label}` : `Connect ${meta.label}`}
            >
              <span className="text-lg leading-none">{meta.icon}</span>
              <span className="flex-1 text-sm text-slate-300 group-hover:text-white transition-colors truncate">
                {meta.label}
              </span>
              <StatusBadge connected={row.connected} />
            </motion.button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-white/5 px-3 py-3">
        <Link href="/connections">
          <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
            <Settings className="h-3 w-3" />
            Manage integrations
            <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
