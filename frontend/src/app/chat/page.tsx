"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Eraser, LogOut, Zap } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChatHistory } from "@/components/chat/ChatHistory";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { InputBar } from "@/components/chat/InputBar";
import { ServiceSidebar } from "@/components/connections/ServiceSidebar";
import { Button } from "@/components/ui/button";
import { useChatStream } from "@/hooks/use-chat-stream";
import type { Message } from "@/hooks/use-chat-stream";
import {
  fetchChatHistory,
  fetchThreadMessages,
  registerUser,
  type ConversationSummary,
} from "@/lib/api";

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
          style={{ left: p.left, bottom: "-10px", width: p.size, height: p.size }}
          animate={{
            y: [0, typeof window !== "undefined" ? -window.innerHeight : -900],
            opacity: [0, 0.6, 0.3, 0],
          }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </div>
  );
}

/** Loading screen shown while session is being resolved. */
function SessionLoading() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#050508]">
      <motion.div
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        className="flex items-center gap-2 text-slate-500"
      >
        <Zap className="h-4 w-4 text-indigo-500" />
        <span className="text-sm">Loading…</span>
      </motion.div>
    </div>
  );
}

/** Inner chat UI — only rendered once userId is known. */
function ChatInterface({ userId }: { userId: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);

  // Register user + fetch history on mount.
  useEffect(() => {
    void registerUser(userId);
    fetchChatHistory(userId).then(setConversations).catch(() => {});
  }, [userId]);

  // Called by the hook when the first message of a brand-new thread is sent.
  const handleFirstMessage = useCallback(
    (threadId: string, text: string) => {
      const entry: ConversationSummary = {
        id: threadId,
        title: text.slice(0, 50),
        updated_at: new Date().toISOString(),
      };
      setConversations((prev) => [entry, ...prev.filter((c) => c.id !== threadId)]);
      setActiveThreadId(threadId);
    },
    [],
  );

  const {
    messages,
    isLoading,
    isConnected,
    input,
    setInput,
    sendMessage,
    confirmPending,
    cancelPending,
    clearMessages,
    currentThreadId,
    resetSession,
  } = useChatStream(userId, { onFirstMessage: handleFirstMessage });

  const handleSuggestion = (text: string) => {
    setInput(text);
    sendMessage(text);
  };

  const handleEditDraft = () => {
    setInput("Update the draft: ");
  };

  const handleSelectThread = async (threadId: string) => {
    if (threadId === activeThreadId) return;
    setActiveThreadId(threadId);
    // Fetch past messages so the user sees the full conversation.
    let past: Message[] = [];
    try {
      const records = await fetchThreadMessages(userId, threadId);
      past = records.map((r) => ({
        id: r.id,
        role: r.role as "user" | "assistant",
        content: r.content,
        timestamp: new Date(r.created_at),
      }));
    } catch {
      // Agent still has LangGraph state even if message fetch fails.
    }
    resetSession(threadId, past);
    // Bump this thread to the top of the list.
    setConversations((prev) => {
      const found = prev.find((c) => c.id === threadId);
      if (!found) return prev;
      return [{ ...found, updated_at: new Date().toISOString() }, ...prev.filter((c) => c.id !== threadId)];
    });
  };

  const handleNewChat = () => {
    setActiveThreadId(null);
    resetSession(null);
  };

  const handleDeleteConversation = (threadId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== threadId));
    // If we just deleted the active thread, start a new chat.
    if (activeThreadId === threadId) {
      setActiveThreadId(null);
      resetSession(null);
    }
  };

  const handleRenameConversation = (threadId: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === threadId ? { ...c, title: newTitle } : c)),
    );
  };

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#050508]">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-64 -top-64 h-[600px] w-[600px] rounded-full bg-indigo-950/60 blur-3xl" />
        <div className="absolute -bottom-64 -right-64 h-[600px] w-[600px] rounded-full bg-violet-950/40 blur-3xl" />
      </div>

      <Particles />

      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            key="sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 shrink-0 overflow-hidden"
            style={{ backdropFilter: "blur(24px)", background: "rgba(255,255,255,0.03)" }}
          >
            <div className="w-[260px] flex flex-col h-full overflow-hidden">
              <div className="shrink-0">
                <ServiceSidebar userId={userId} />
              </div>
              <div className="flex-1 overflow-hidden min-h-0">
                <ChatHistory
                  userId={userId}
                  conversations={conversations}
                  activeThreadId={activeThreadId}
                  onSelectThread={(id) => void handleSelectThread(id)}
                  onNewChat={handleNewChat}
                  onDelete={handleDeleteConversation}
                  onRename={handleRenameConversation}
                />
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main chat area */}
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <header
          className="flex items-center gap-3 px-4 py-3"
          style={{ backdropFilter: "blur(16px)", background: "rgba(255,255,255,0.02)" }}
        >
          <Button
            variant="ghost"
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

          <Link href="/" className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/30 border border-indigo-500/40">
              <Zap className="h-3.5 w-3.5 text-indigo-400" />
            </div>
            <span className="gradient-text text-sm font-semibold tracking-tight text-white drop-shadow-sm">
              Omni Copilot
            </span>
          </Link>

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
              className="text-slate-300 hover:text-white text-xs gap-1"
            >
              <Eraser className="h-3 w-3" />
              Clear
            </Button>
          )}

          {/* Sign out */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sign out"
            className="text-slate-300 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </header>

        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          onSuggestion={handleSuggestion}
          onConfirmDraft={confirmPending}
          onCancelDraft={cancelPending}
          onEditDraft={handleEditDraft}
        />

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

/** Main chat interface page — requires an authenticated session. */
export default function ChatPage() {
  const { data: session, status } = useSession({ required: true });

  if (status === "loading") return <SessionLoading />;

  return <ChatInterface userId={session.user.id} />;
}
