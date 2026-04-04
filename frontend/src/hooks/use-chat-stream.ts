"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WS_BACKEND } from "@/lib/api";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface UseChatStreamReturn {
  messages: Message[];
  isLoading: boolean;
  isConnected: boolean;
  input: string;
  setInput: (value: string) => void;
  sendMessage: (content?: string) => void;
  clearMessages: () => void;
}

/**
 * Hook that manages a persistent WebSocket connection to the backend chat endpoint.
 * Handles reconnection, message queueing, and streaming status.
 */
export function useChatStream(userId: string): UseChatStreamReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [input, setInput] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`${WS_BACKEND}/api/chat/ws`);

    ws.onopen = () => setIsConnected(true);

    ws.onmessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data as string) as {
        type: string;
        message?: string;
      };

      if (data.type === "status") {
        setIsLoading(true);
      } else if (data.type === "final" && data.message) {
        setIsLoading(false);
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
      // Reconnect after 2s
      reconnectRef.current = setTimeout(connect, 2000);
    };

    ws.onerror = () => {
      ws.close();
    };

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

      const payload = JSON.stringify({ user_id: userId, message: text });

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(payload);
      } else {
        // Connect and retry once open
        connect();
        const retry = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(payload);
            clearInterval(retry);
          }
        }, 100);
        setTimeout(() => clearInterval(retry), 5000);
      }
    },
    [input, isLoading, userId, connect],
  );

  const clearMessages = useCallback(() => setMessages([]), []);

  return {
    messages,
    isLoading,
    isConnected,
    input,
    setInput,
    sendMessage,
    clearMessages,
  };
}
