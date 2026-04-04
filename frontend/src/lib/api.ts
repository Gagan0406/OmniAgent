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
