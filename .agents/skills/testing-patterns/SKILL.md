---
name: testing-patterns
description: "When writing tests for Omni Copilot. Covers pytest patterns for LangGraph agents, Composio tool mocking, FastAPI endpoint testing, and vitest patterns for React components."
---

# Testing Patterns — Omni Copilot

## Backend (pytest + pytest-asyncio)

### Fixtures (defined in `tests/conftest.py`)

```python
@pytest.fixture
def mock_groq_response():
    """Returns a mock ChatGroq that returns a predetermined response."""
    ...

@pytest.fixture
def mock_composio_toolset():
    """Returns a mock ComposioToolSet with pre-registered tools."""
    ...

@pytest.fixture
def test_user():
    """Returns a test user with a valid Composio entity mapping."""
    ...

@pytest.fixture
async def async_client(app):
    """Returns an httpx.AsyncClient wired to the FastAPI test app."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client
```

### Testing LangGraph Agents

```python
async def test_agent_routes_gmail_query_to_gmail_tool():
    """When the user asks about email, the agent should invoke the Gmail tool."""
    state = AgentState(
        messages=[HumanMessage(content="Check my latest emails")],
        user_id="test-user-123",
    )
    result = await compiled_graph.ainvoke(state)
    assert any(
        tc.name.startswith("GMAIL_") for tc in result["tool_calls"]
    )
```

### Testing Composio Tools

```python
async def test_gmail_list_messages_returns_emails(mock_composio_toolset):
    """Gmail tool should return formatted email list from Composio."""
    mock_composio_toolset.execute_action.return_value = {
        "data": [{"subject": "Test", "from": "a@b.com"}]
    }
    result = await gmail_list_tool.ainvoke({"query": "is:unread"})
    assert "Test" in result
```

### Testing API Endpoints

```python
async def test_connections_endpoint_returns_user_services(async_client, test_user):
    """GET /api/connections should return the user's connected services."""
    response = await async_client.get(
        "/api/connections",
        headers={"Authorization": f"Bearer {test_user.token}"},
    )
    assert response.status_code == 200
    assert "google" in response.json()["connections"]
```

## Frontend (vitest + React Testing Library)

### Component Tests

```typescript
test("ChatInput sends message on submit", async () => {
  const onSend = vi.fn();
  render(<ChatInput onSend={onSend} />);
  await userEvent.type(screen.getByRole("textbox"), "Hello");
  await userEvent.click(screen.getByRole("button", { name: /send/i }));
  expect(onSend).toHaveBeenCalledWith("Hello");
});
```

### Mocking API Calls (MSW)

```typescript
const handlers = [
  http.get("/api/connections", () =>
    HttpResponse.json({ connections: { google: true, notion: false } })
  ),
];
```

## Rules
- Never call real Composio or Groq APIs in tests — always mock
- Test file naming: `test_<module>.py` (backend), `<Component>.test.tsx` (frontend)
- One assert concept per test — multiple asserts are OK if testing the same behavior
- Use descriptive test names: `test_<what>_<condition>_<expected>`
