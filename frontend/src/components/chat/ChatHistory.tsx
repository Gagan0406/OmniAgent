"use client";

import { motion } from "framer-motion";
import { Clock, MessageSquarePlus, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  deleteConversation,
  renameConversation,
  type ConversationSummary,
} from "@/lib/api";

interface ChatHistoryProps {
  userId: string;
  /** The full list of conversations — owned and managed by the parent. */
  conversations: ConversationSummary[];
  activeThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onNewChat: () => void;
  /** Tell the parent to remove a conversation from state. */
  onDelete: (threadId: string) => void;
  /** Tell the parent to update a conversation title in state. */
  onRename: (threadId: string, newTitle: string) => void;
}

interface ContextMenu {
  x: number;
  y: number;
  conv: ConversationSummary;
}

function relativeTime(iso: string): string {
  const normalized = /[Zz]|[+-]\d{2}:\d{2}$/.test(iso) ? iso : iso + "Z";
  const diff = Date.now() - new Date(normalized).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(normalized).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ChatHistory({
  userId,
  conversations,
  activeThreadId,
  onSelectThread,
  onNewChat,
  onDelete,
  onRename,
}: ChatHistoryProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId) renameInputRef.current?.select();
  }, [renamingId]);

  const openContextMenu = (e: React.MouseEvent, conv: ConversationSummary) => {
    e.preventDefault();
    e.stopPropagation();
    const menuW = 160;
    const menuH = 88;
    const x = e.clientX + menuW > window.innerWidth ? e.clientX - menuW : e.clientX;
    const y = e.clientY + menuH > window.innerHeight ? e.clientY - menuH : e.clientY;
    setContextMenu({ x, y, conv });
  };

  const closeContextMenu = () => setContextMenu(null);

  const handleDelete = async () => {
    if (!contextMenu) return;
    const { conv } = contextMenu;
    closeContextMenu();
    try {
      await deleteConversation(userId, conv.id);
      onDelete(conv.id);
    } catch {
      /* silent */
    }
  };

  const handleStartRename = () => {
    if (!contextMenu) return;
    const { conv } = contextMenu;
    closeContextMenu();
    setRenamingId(conv.id);
    setRenameValue(conv.title);
  };

  const commitRename = async (threadId: string) => {
    const trimmed = renameValue.trim();
    setRenamingId(null);
    if (!trimmed) return;
    try {
      await renameConversation(userId, threadId, trimmed);
      onRename(threadId, trimmed);
    } catch {
      /* silent */
    }
  };

  return (
    <div className="flex flex-col h-full border-t border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          History
        </h2>
        <button
          onClick={onNewChat}
          title="New chat"
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          New
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
        {conversations.length === 0 && (
          <p className="px-2 py-3 text-xs text-slate-500">No conversations yet.</p>
        )}

        {conversations.map((conv, i) => {
          const isActive = conv.id === activeThreadId;
          const isRenaming = renamingId === conv.id;

          return (
            <motion.div
              key={conv.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.25 }}
              onContextMenu={(e) => openContextMenu(e, conv)}
              onClick={() => { if (!isRenaming) onSelectThread(conv.id); }}
              className={`w-full flex items-start gap-2 rounded-xl px-3 py-2 text-left cursor-pointer transition-all duration-150 group select-none ${
                isActive
                  ? "bg-indigo-600/20 border border-indigo-500/30"
                  : "hover:bg-white/5 border border-transparent"
              }`}
            >
              <div className="flex-1 min-w-0">
                {isRenaming ? (
                  <input
                    ref={renameInputRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => void commitRename(conv.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void commitRename(conv.id);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-transparent text-xs text-white border-b border-indigo-400 outline-none pb-0.5 caret-white"
                  />
                ) : (
                  <p className={`text-xs truncate leading-snug transition-colors ${
                    isActive ? "text-indigo-300" : "text-slate-300 group-hover:text-white"
                  }`}>
                    {conv.title}
                  </p>
                )}
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className="h-2.5 w-2.5 text-slate-600" />
                  <span className="text-[10px] text-slate-500">{relativeTime(conv.updated_at)}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Context menu */}
      {contextMenu && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={closeContextMenu}
            onContextMenu={(e) => { e.preventDefault(); closeContextMenu(); }}
          />
          <div
            className="fixed z-[9999] min-w-[150px] overflow-hidden rounded-xl border border-white/10 bg-slate-800/95 backdrop-blur-sm shadow-2xl py-1"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10 transition-colors"
              onClick={handleStartRename}
            >
              <Pencil className="h-3.5 w-3.5 text-slate-400" />
              Rename
            </button>
            <div className="mx-2 my-0.5 h-px bg-white/10" />
            <button
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              onClick={() => void handleDelete()}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
