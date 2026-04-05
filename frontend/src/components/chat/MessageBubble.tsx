"use client";

import { motion } from "framer-motion";
import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { type Message } from "@/hooks/use-chat-stream";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: Message;
  index: number;
}

/**
 * Renders a single chat message with entrance animation.
 * AI messages render full markdown (GFM) with custom dark-theme components.
 * User messages are plain text in an indigo gradient bubble.
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
        {isUser ? (
          // User messages: plain text, preserve newlines
          <span className="whitespace-pre-wrap">{message.content}</span>
        ) : (
          // AI messages: full markdown rendering
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Paragraphs
              p: ({ children }) => (
                <p className="mb-3 last:mb-0 leading-relaxed text-slate-200">{children}</p>
              ),

              // Headings
              h1: ({ children }) => (
                <h1 className="text-xl font-bold text-white mb-3 mt-4 first:mt-0">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-lg font-semibold text-white mb-2 mt-4 first:mt-0">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base font-semibold text-white mb-2 mt-3 first:mt-0">{children}</h3>
              ),

              // Lists
              ul: ({ children }) => (
                <ul className="list-disc list-outside pl-5 mb-3 space-y-1 text-slate-200">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-outside pl-5 mb-3 space-y-1 text-slate-200">{children}</ol>
              ),
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,

              // Inline code only — block code is handled by `pre` below
              code: ({ children, ...props }) => (
                <code
                  className="px-1.5 py-0.5 rounded-md bg-white/10 text-indigo-300 text-[13px] font-mono"
                  {...props}
                >
                  {children}
                </code>
              ),

              // Code block wrapper — styles the <pre> and the <code> inside it
              pre: ({ children }) => (
                <pre className="mb-3 last:mb-0 rounded-xl bg-black/50 border border-white/10 px-4 py-3 text-[13px] font-mono text-emerald-300 overflow-x-auto whitespace-pre">
                  {children}
                </pre>
              ),

              // Blockquote
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-indigo-500 pl-4 my-3 text-slate-400 italic">
                  {children}
                </blockquote>
              ),

              // Bold & italic
              strong: ({ children }) => (
                <strong className="font-semibold text-white">{children}</strong>
              ),
              em: ({ children }) => (
                <em className="italic text-slate-300">{children}</em>
              ),

              // Horizontal rule
              hr: () => <hr className="my-4 border-white/10" />,

              // Links
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 underline underline-offset-2 hover:text-indigo-300 transition-colors"
                >
                  {children}
                </a>
              ),

              // GFM Tables
              table: ({ children }) => (
                <div className="my-3 overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-sm text-left">{children}</table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-white/5 text-slate-300 text-xs uppercase tracking-wider">
                  {children}
                </thead>
              ),
              tbody: ({ children }) => (
                <tbody className="divide-y divide-white/6">{children}</tbody>
              ),
              tr: ({ children }) => <tr className="hover:bg-white/[0.03] transition-colors">{children}</tr>,
              th: ({ children }) => (
                <th className="px-4 py-2.5 font-semibold text-slate-200">{children}</th>
              ),
              td: ({ children }) => (
                <td className="px-4 py-2.5 text-slate-300">{children}</td>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </motion.div>
  );
}
