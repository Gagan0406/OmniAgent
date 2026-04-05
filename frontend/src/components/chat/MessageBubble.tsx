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
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay: Math.min(index * 0.04, 0.2),
        ease: [0.23, 1, 0.32, 1],
      }}
      className={cn("flex items-end gap-3 px-4 mx-auto w-full max-w-4xl", isUser && "flex-row-reverse")}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-sm",
          isUser
            ? "bg-gradient-to-tr from-indigo-500 to-purple-500 border-indigo-400/30 text-white"
            : "bg-gradient-to-br from-indigo-950/80 to-slate-900 border-white/10 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]",
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4 drop-shadow-[0_0_5px_currentColor]" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[80%] rounded-3xl px-5 py-3.5 text-[15px] leading-relaxed shadow-sm",
          isUser
            ? "rounded-br-sm bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-indigo-900/40 font-medium tracking-wide"
            : "rounded-bl-sm bg-transparent text-slate-200 border-transparent",
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
