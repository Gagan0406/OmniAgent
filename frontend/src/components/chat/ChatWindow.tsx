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
}

const SUGGESTIONS = [
  "Read my latest emails",
  "What's on my calendar today?",
  "Search my Notion for meeting notes",
  "List files in the workspace",
];

/** Scrollable messages area with empty-state suggestions. */
export function ChatWindow({ messages, isLoading, onSuggestion }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
        {/* Hero icon */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-600/20 border border-indigo-500/30 shadow-xl shadow-indigo-900/30">
            <Bot className="h-10 w-10 text-indigo-400" />
          </div>
          <motion.div
            className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 border-2 border-[#050508]"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="h-3 w-3 text-white" />
          </motion.div>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="space-y-2"
        >
          <h2 className="text-2xl font-semibold text-slate-100">
            How can I help you today?
          </h2>
          <p className="text-sm text-slate-500 max-w-xs">
            Ask about your files, emails, calendar, Notion, Slack — or anything else.
          </p>
        </motion.div>

        {/* Suggestion pills */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="flex flex-wrap justify-center gap-2 max-w-sm"
        >
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onSuggestion(s)}
              className="rounded-xl border border-white/8 bg-white/4 px-4 py-2 text-xs text-slate-400 transition-all duration-200 hover:border-indigo-500/40 hover:bg-indigo-600/10 hover:text-indigo-300"
            >
              {s}
            </button>
          ))}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto py-6">
      <AnimatePresence initial={false}>
        {messages.map((msg, i) => (
          <MessageBubble key={msg.id} message={msg} index={i} />
        ))}
        {isLoading && <TypingIndicator key="typing" />}
      </AnimatePresence>
      <div ref={bottomRef} className="h-1 shrink-0" />
    </div>
  );
}
