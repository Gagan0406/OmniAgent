"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Eraser, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { InputBar } from "@/components/chat/InputBar";
import { ServiceSidebar } from "@/components/connections/ServiceSidebar";
import { Button } from "@/components/ui/button";
import { useChatStream } from "@/hooks/use-chat-stream";

// Hardcoded for Phase 2 — Phase 3 will derive from NextAuth session
const USER_ID = "local-dev-user";

/** Animated floating background particles. */
function Particles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        size: 1 + Math.random() * 2,
        duration: 12 + Math.random() * 16,
        delay: Math.random() * 10,
      })),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-indigo-500/20"
          style={{
            left: p.left,
            bottom: "-10px",
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, typeof window !== "undefined" ? -window.innerHeight : -900],
            opacity: [0, 0.6, 0.3, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

/** Main chat interface page. */
export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { messages, isLoading, isConnected, input, setInput, sendMessage, clearMessages } =
    useChatStream(USER_ID);

  const handleSuggestion = (text: string) => {
    setInput(text);
    sendMessage(text);
  };

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#050508]">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-64 -top-64 h-[600px] w-[600px] rounded-full bg-indigo-950/60 blur-3xl" />
        <div className="absolute -bottom-64 -right-64 h-[600px] w-[600px] rounded-full bg-violet-950/40 blur-3xl" />
      </div>

      <Particles />

      {/* ── Sidebar ── */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            key="sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 shrink-0 overflow-hidden border-r border-white/6"
            style={{ backdropFilter: "blur(24px)", background: "rgba(255,255,255,0.03)" }}
          >
            <div className="w-[260px]">
              <ServiceSidebar userId={USER_ID} />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main chat area ── */}
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-white/6 px-4 py-3"
          style={{ backdropFilter: "blur(16px)", background: "rgba(255,255,255,0.02)" }}
        >
          {/* Sidebar toggle */}
          <Button
            variant="icon"
            size="icon"
            onClick={() => setSidebarOpen((v) => !v)}
            title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>

          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/30 border border-indigo-500/40">
              <Zap className="h-3.5 w-3.5 text-indigo-400" />
            </div>
            <span className="gradient-text text-sm font-semibold tracking-tight">
              Omni Copilot
            </span>
          </div>

          {/* Connection status pill */}
          <div
            className={`ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs border ${
              isConnected
                ? "border-emerald-900/50 bg-emerald-950/40 text-emerald-400"
                : "border-amber-900/50 bg-amber-950/40 text-amber-400"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400 animate-pulse"
              }`}
            />
            {isConnected ? "Live" : "Connecting"}
          </div>

          {/* Clear */}
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearMessages}
              className="text-slate-600 hover:text-slate-400 text-xs gap-1"
            >
              <Eraser className="h-3 w-3" />
              Clear
            </Button>
          )}
        </header>

        {/* Messages */}
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          onSuggestion={handleSuggestion}
        />

        {/* Input */}
        <InputBar
          value={input}
          onChange={setInput}
          onSend={sendMessage}
          isLoading={isLoading}
          isConnected={isConnected}
        />
      </div>
    </div>
  );
}
