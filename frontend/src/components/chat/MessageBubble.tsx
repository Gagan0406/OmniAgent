"use client";

import { motion } from "framer-motion";
import { Bot, User } from "lucide-react";
import { type Message } from "@/hooks/use-chat-stream";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: Message;
  index: number;
}

/**
 * Renders a single chat message with entrance animation.
 * AI messages are left-aligned with a glass bubble and Bot icon avatar;
 * user messages are right-aligned with an indigo gradient bubble and User icon.
 */
export function MessageBubble({ message, index }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.38,
        delay: Math.min(index * 0.04, 0.2),
        ease: [0.16, 1, 0.3, 1],
      }}
      className={cn("flex items-end gap-3 px-4", isUser && "flex-row-reverse")}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border",
          isUser
            ? "bg-indigo-600/25 border-indigo-500/35 text-indigo-300"
            : "bg-white/5 border-white/10 text-indigo-400",
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[72%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "rounded-br-sm bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-900/30"
            : "rounded-bl-sm bg-black/40 backdrop-blur-xl border border-white/10 text-slate-200",
        )}
      >
        {message.content.split("\n").map((line, i) =>
          line ? (
            <p key={i} className={i > 0 ? "mt-1.5" : ""}>
              {line}
            </p>
          ) : (
            <br key={i} />
          ),
        )}
      </div>
    </motion.div>
  );
}
