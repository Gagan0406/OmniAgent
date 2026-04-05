const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
const WS_BACKEND = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

export { BACKEND, WS_BACKEND };

export interface Connection {
  app: string;
  connected: boolean;
  status: string;
}

export interface ConnectionsResponse {
  user_id: string;
  connections: Connection[];
}

/** Fetch all service connections for a user. */
export async function fetchConnections(userId: string): Promise<ConnectionsResponse> {
  const res = await fetch(`${BACKEND}/api/connections?user_id=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error("Failed to fetch connections");
  return res.json() as Promise<ConnectionsResponse>;
}

/** Initiate an OAuth connection for a service. Returns the redirect URL. */
export async function initiateConnection(
  userId: string,
  appName: string,
): Promise<string> {
  const res = await fetch(
    `${BACKEND}/api/connections/${appName}/initiate?user_id=${encodeURIComponent(userId)}`,
    { method: "POST" },
  );
  if (!res.ok) {
    const err = (await res.json()) as { detail?: string };
    throw new Error(err.detail ?? "Failed to initiate connection");
  }
  const data = (await res.json()) as { redirect_url: string };
  return data.redirect_url;
}

/** Disconnect a service. */
export async function disconnectService(userId: string, appName: string): Promise<void> {
  await fetch(
    `${BACKEND}/api/connections/${appName}?user_id=${encodeURIComponent(userId)}`,
    { method: "DELETE" },
  );
}

export interface ConversationSummary {
  id: string;
  title: string;
  updated_at: string;
}

/** Fetch the 20 most recent conversation sessions for a user. */
export async function fetchChatHistory(userId: string): Promise<ConversationSummary[]> {
  const res = await fetch(
    `${BACKEND}/api/chat/history?user_id=${encodeURIComponent(userId)}`,
  );
  if (!res.ok) throw new Error("Failed to fetch chat history");
  return res.json() as Promise<ConversationSummary[]>;
}

export interface MessageRecord {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

/** Fetch all messages for a conversation thread. */
export async function fetchThreadMessages(userId: string, threadId: string): Promise<MessageRecord[]> {
  const res = await fetch(
    `${BACKEND}/api/chat/history/${encodeURIComponent(threadId)}/messages?user_id=${encodeURIComponent(userId)}`,
  );
  if (!res.ok) throw new Error("Failed to fetch messages");
  return res.json() as Promise<MessageRecord[]>;
}

/** Delete a conversation from history. */
export async function deleteConversation(userId: string, threadId: string): Promise<void> {
  await fetch(
    `${BACKEND}/api/chat/history/${encodeURIComponent(threadId)}?user_id=${encodeURIComponent(userId)}`,
    { method: "DELETE" },
  );
}

/** Rename a conversation. Returns the updated record. */
export async function renameConversation(
  userId: string,
  threadId: string,
  title: string,
): Promise<ConversationSummary> {
  const res = await fetch(
    `${BACKEND}/api/chat/history/${encodeURIComponent(threadId)}?user_id=${encodeURIComponent(userId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    },
  );
  if (!res.ok) throw new Error("Failed to rename conversation");
  return res.json() as Promise<ConversationSummary>;
}

/** Register the signed-in user with the backend to ensure their Composio entity exists. */
export async function registerUser(userId: string, email?: string, name?: string): Promise<void> {
  try {
    await fetch(`${BACKEND}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, email, name }),
    });
  } catch {
    // Backend unreachable — non-fatal, user can still use the UI.
    console.warn("Backend unreachable: could not register user");
  }
}
