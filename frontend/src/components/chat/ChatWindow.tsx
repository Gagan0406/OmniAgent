"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bot, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";
import { type Message } from "@/hooks/use-chat-stream";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  onSuggestion: (text: string) => void;
  onConfirmDraft: () => void;
  onCancelDraft: () => void;
  onEditDraft: () => void;
}

const SUGGESTIONS = [
  "Read my latest emails",
  "What's on my calendar today?",
  "Search my Notion for meeting notes",
  "List files in the workspace",
];

/** Scrollable messages area with empty-state suggestions. */
export function ChatWindow({
  messages,
  isLoading,
  onSuggestion,
  onConfirmDraft,
  onCancelDraft,
  onEditDraft,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = bottomRef.current?.parentElement;
    if (parent) {
      parent.scrollTo({
        top: parent.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, isLoading]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-12 text-center h-full my-auto mt-20">
        {/* Animated AI Orb Hero */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex items-center justify-center"
        >
          {/* Ambient Glow */}
          <motion.div
            className="absolute h-32 w-32 rounded-full bg-indigo-600/20 blur-2xl"
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-indigo-900/40 to-slate-900/40 border border-white/10 shadow-[0_0_40px_rgba(99,102,241,0.2)] backdrop-blur-xl">
            <Bot className="h-10 w-10 text-indigo-300 drop-shadow-[0_0_10px_rgba(165,180,252,0.8)]" />
          </div>
          <motion.div
            className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.6)]"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="h-4 w-4 text-white" />
          </motion.div>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="space-y-4"
        >
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-300 drop-shadow-sm pb-1">
            How can I help you today?
          </h2>
          <p className="text-base text-slate-400 max-w-md mx-auto font-light">
            Ask about your files, emails, calendar, Notion, Slack — or absolutely anything else.
          </p>
        </motion.div>

        {/* Bento Suggestion Pills */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto w-full mt-4"
        >
          {SUGGESTIONS.map((s, idx) => (
            <motion.button
              key={s}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSuggestion(s)}
              className="flex items-center text-left rounded-2xl border border-white/5 bg-white/[0.02] px-5 py-4 text-sm text-slate-300 transition-colors hover:border-indigo-500/30 hover:bg-indigo-500/10 hover:text-indigo-200 group"
            >
              <span className="flex-1 font-medium">{s}</span>
              <span className="ml-3 text-indigo-400 opacity-0 transition-opacity group-hover:opacity-100">&rarr;</span>
            </motion.button>
          ))}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto py-6">
      <AnimatePresence initial={false}>
        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            index={i}
            onConfirmDraft={onConfirmDraft}
            onCancelDraft={onCancelDraft}
            onEditDraft={onEditDraft}
          />
        ))}
        {isLoading && <TypingIndicator key="typing" />}
      </AnimatePresence>
      <div ref={bottomRef} className="h-1 shrink-0" />
    </div>
  );
}
