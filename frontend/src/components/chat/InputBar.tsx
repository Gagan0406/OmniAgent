"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Mic, Paperclip, Square, WifiOff } from "lucide-react";
import { useCallback, useRef, useEffect } from "react";
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

  useEffect(() => {
    if (!value) adjustHeight();
  }, [value, adjustHeight]);

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
    <div className="px-4 md:px-12 pb-6 pt-2 w-full max-w-4xl mx-auto">
      <motion.div
        className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0c0c14]/80 backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
        animate={{
          boxShadow: isLoading
            ? "0 0 0 1px rgba(99,102,241,0.5), 0 0 60px rgba(99,102,241,0.2)"
            : "0 0 0 1px rgba(99,102,241,0.15), 0 8px 32px rgba(0,0,0,0.4)",
        }}
        transition={{ duration: 0.4 }}
      >
        {/* Shimmer scan line while loading */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_15px_rgba(129,140,248,0.8)]"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
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
              <div className="flex items-center justify-center gap-2 border-b border-rose-900/40 bg-rose-950/30 px-4 py-2.5 text-xs font-medium text-rose-300">
                <WifiOff className="h-3.5 w-3.5 shrink-0" />
                Connection lost. Trying to reconnect...
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Textarea */}
        <div className="px-5 pt-4 pb-1">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask Omni Copilot anything..."
            rows={1}
            className="text-base md:text-[15px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0 text-slate-100 placeholder:text-slate-500 shadow-none min-h-[44px] max-h-[200px]"
            disabled={isLoading}
          />
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-white rounded-xl transition-colors cursor-not-allowed group">
              <Paperclip className="h-4 w-4 group-hover:scale-110 transition-transform" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-white rounded-xl transition-colors cursor-not-allowed group">
              <Mic className="h-4 w-4 group-hover:scale-110 transition-transform" />
            </Button>
            <span className="ml-2 text-[10px] uppercase font-mono tracking-widest text-slate-400 hidden sm:block">Shift+Enter for newline</span>
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
                  className="h-10 w-10 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
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
                  className="h-10 w-10 rounded-xl disabled:opacity-30 disabled:bg-indigo-600 bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)] transition-all hover:-translate-y-0.5"
                >
                  <ArrowUp className="h-5 w-5 stroke-[2.5]" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <p className="mt-3 text-center text-xs text-slate-400 font-light">
        Omni Copilot can make mistakes. Verify important information.
      </p>
    </div>
  );
}
