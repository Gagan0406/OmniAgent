---
name: code-style
description: "When writing new code for Omni Copilot. Covers Python and TypeScript conventions, import ordering, naming patterns, and anti-patterns to avoid."
---

# Code Style — Omni Copilot

## Python (backend/)

### Good
```python
async def get_user_connections(user_id: str, composio: ComposioService) -> list[Connection]:
    """Fetch all connected services for a user.

    Args:
        user_id: Internal user ID.
        composio: Composio service instance.

    Returns:
        List of active connections with their status.
    """
    entity = await composio.get_entity(user_id)
    return [Connection.from_composio(c) for c in entity.connections]
```

### Bad
```python
def getConnections(uid, c):  # no async, no types, cryptic names
    print(f"getting connections for {uid}")  # use structlog
    data = c.get(uid)  # no error handling
    return data
```

### Import Order
```python
# 1. stdlib
import asyncio
from datetime import datetime

# 2. third-party
from fastapi import APIRouter, Depends
from langgraph.graph import StateGraph

# 3. local
from app.config import settings
from app.services.composio_service import ComposioService
```

## TypeScript (frontend/)

### Good
```typescript
export function ServiceCard({ service, onConnect }: ServiceCardProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await onConnect(service.id);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-medium">{service.name}</h3>
      <button onClick={handleConnect} disabled={isConnecting}>
        {isConnecting ? "Connecting..." : "Connect"}
      </button>
    </div>
  );
}
```

### Anti-patterns to Avoid
- `any` type without explanation comment
- Inline styles instead of Tailwind classes
- Default exports (use named exports)
- `useEffect` for derived state (use `useMemo` instead)
