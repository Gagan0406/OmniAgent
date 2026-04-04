"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Mic, Paperclip, Square, WifiOff } from "lucide-react";
import { useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface InputBarProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  isConnected: boolean;
}

/**
 * Auto-resizing chat input with shimmer loading animation, animated send/stop
 * button, and a WifiOff disconnect banner.
 */
export function InputBar({ value, onChange, onSend, isLoading, isConnected }: InputBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && value.trim()) onSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    adjustHeight();
  };

  return (
    <div className="px-4 pb-4 pt-2">
      <motion.div
        className="relative overflow-hidden rounded-2xl border border-white/10"
        style={{ background: "rgba(10,10,20,0.8)", backdropFilter: "blur(24px)" }}
        animate={{
          boxShadow: isLoading
            ? "0 0 0 1px rgba(99,102,241,0.5), 0 0 48px rgba(99,102,241,0.18)"
            : "0 0 0 1px rgba(99,102,241,0.15), 0 0 24px rgba(99,102,241,0.04)",
        }}
        transition={{ duration: 0.5 }}
      >
        {/* Shimmer scan line while loading */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
            />
          )}
        </AnimatePresence>

        {/* Disconnect banner */}
        <AnimatePresence>
          {!isConnected && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 border-b border-amber-900/30 bg-amber-950/20 px-4 py-2 text-xs text-amber-400/90">
                <WifiOff className="h-3 w-3 shrink-0" />
                Reconnecting to server…
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Textarea */}
        <div className="px-4 pt-3 pb-1">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything — your files, Gmail, calendar, Notion…"
            rows={1}
            style={{ minHeight: "44px", maxHeight: "180px" }}
            disabled={isLoading}
          />
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-3 pb-3">
          <div className="flex items-center gap-1">
            <Button variant="icon" size="icon" className="opacity-40 cursor-not-allowed" disabled>
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button variant="icon" size="icon" className="opacity-40 cursor-not-allowed" disabled>
              <Mic className="h-4 w-4" />
            </Button>
            <span className="ml-2 text-xs text-slate-600">Shift+Enter for newline</span>
          </div>

          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="stop"
                initial={{ scale: 0.7, opacity: 0, rotate: -90 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.7, opacity: 0, rotate: 90 }}
                transition={{ duration: 0.18, ease: "backOut" }}
              >
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 border-indigo-500/40 text-indigo-400 hover:text-indigo-300"
                  disabled
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="send"
                initial={{ scale: 0.7, opacity: 0, rotate: 90 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.7, opacity: 0, rotate: -90 }}
                transition={{ duration: 0.18, ease: "backOut" }}
              >
                <Button
                  size="icon"
                  onClick={onSend}
                  disabled={!value.trim() || !isConnected}
                  className="h-9 w-9 shadow-lg shadow-indigo-900/40"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <p className="mt-2 text-center text-xs text-slate-700">
        Omni Copilot can make mistakes. Verify important information.
      </p>
    </div>
  );
}
