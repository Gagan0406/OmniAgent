"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WS_BACKEND } from "@/lib/api";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  confirmation?: {
    toolName: string;
    draft: string;
  };
}

function newThreadId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface UseChatStreamOptions {
  /** Fires after the first user message of a new thread is sent. */
  onFirstMessage?: (threadId: string, text: string) => void;
}

interface UseChatStreamReturn {
  messages: Message[];
  isLoading: boolean;
  isConnected: boolean;
  input: string;
  setInput: (value: string) => void;
  sendMessage: (content?: string) => void;
  confirmPending: () => void;
  cancelPending: () => void;
  editPendingDraft: (instruction: string) => void;
  clearMessages: () => void;
  /** The thread ID for the current session (client-generated or from history). */
  currentThreadId: string;
  /**
   * Tear down the current socket and start a new session.
   * - Pass a threadId string to resume a history thread (with optional past messages).
   * - Pass null (or omit) to start a brand-new thread.
   */
  resetSession: (nextThreadId?: string | null, initialMessages?: Message[]) => void;
}

export function useChatStream(
  userId: string,
  opts: UseChatStreamOptions = {},
): UseChatStreamReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [input, setInput] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstMessageSentRef = useRef(false);
  const threadIdRef = useRef<string>(newThreadId());
  const onFirstMessageRef = useRef(opts.onFirstMessage);
  onFirstMessageRef.current = opts.onFirstMessage;
  const pendingConfirmationRef = useRef<{ toolName: string; draft: string } | null>(null);

  // Expose a stable read of the current thread ID.
  const [currentThreadId, setCurrentThreadId] = useState(threadIdRef.current);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    firstMessageSentRef.current = false;
    const ws = new WebSocket(`${WS_BACKEND}/api/chat/ws`);

    ws.onopen = () => setIsConnected(true);

    ws.onmessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data as string) as {
        type: string;
        message?: string;
        tool_name?: string;
        draft?: string;
      };
      const toolName = data.tool_name;
      const draft = data.draft;

      if (data.type === "status") {
        setIsLoading(true);
      } else if (
        data.type === "confirmation_required" &&
        typeof toolName === "string" &&
        typeof draft === "string"
      ) {
        pendingConfirmationRef.current = {
          toolName,
          draft,
        };
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-assistant-confirm`,
            role: "assistant",
            content: `Draft ready for ${toolName}. Confirm, give edit instructions, or cancel.`,
            timestamp: new Date(),
            confirmation: {
              toolName,
              draft,
            },
          },
        ]);
      } else if (data.type === "final" && data.message) {
        setIsLoading(false);
        if (
          pendingConfirmationRef.current &&
          data.message.toLowerCase().includes("sent successfully")
        ) {
          pendingConfirmationRef.current = null;
        }
        if (
          pendingConfirmationRef.current &&
          data.message.toLowerCase().includes("did not send")
        ) {
          pendingConfirmationRef.current = null;
        }
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-assistant`,
            role: "assistant",
            content: data.message!,
            timestamp: new Date(),
          },
        ]);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setIsLoading(false);
      reconnectRef.current = setTimeout(connect, 2000);
    };

    ws.onerror = () => ws.close();

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback(
    (content?: string) => {
      const text = (content ?? input).trim();
      if (!text || isLoading) return;

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-user`,
          role: "user",
          content: text,
          timestamp: new Date(),
        },
      ]);
      setInput("");
      setIsLoading(true);

      // Always send thread_id on first message so the server knows which thread.
      const isFirst = !firstMessageSentRef.current;
      const payloadObj: Record<string, string> = { user_id: userId, message: text };
      if (isFirst) {
        payloadObj.thread_id = threadIdRef.current;
      }
      firstMessageSentRef.current = true;
      const payload = JSON.stringify(payloadObj);

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(payload);
      } else {
        connect();
        const retry = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(payload);
            clearInterval(retry);
          }
        }, 100);
        setTimeout(() => clearInterval(retry), 5000);
      }

      // Notify parent so it can optimistically add to history.
      if (isFirst) {
        onFirstMessageRef.current?.(threadIdRef.current, text);
      }
    },
    [input, isLoading, userId, connect],
  );

  const clearMessages = useCallback(() => {
    pendingConfirmationRef.current = null;
    setMessages([]);
  }, []);

  const confirmPending = useCallback(() => {
    sendMessage("confirm");
  }, [sendMessage]);

  const cancelPending = useCallback(() => {
    sendMessage("cancel");
  }, [sendMessage]);

  const editPendingDraft = useCallback(
    (instruction: string) => {
      sendMessage(instruction);
    },
    [sendMessage],
  );

  const resetSession = useCallback(
    (nextThreadId?: string | null, initialMessages?: Message[]) => {
      // null/undefined → brand-new thread; string → resume that thread.
      const tid = nextThreadId ?? newThreadId();
      threadIdRef.current = tid;
      setCurrentThreadId(tid);

      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
      setMessages(initialMessages ?? []);
      pendingConfirmationRef.current = null;
      setIsLoading(false);
      connect();
    },
    [connect],
  );

  return {
    messages,
    isLoading,
    isConnected,
    input,
    setInput,
    sendMessage,
    confirmPending,
    cancelPending,
    editPendingDraft,
    clearMessages,
    currentThreadId,
    resetSession,
  };
}
