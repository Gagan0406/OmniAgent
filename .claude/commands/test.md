Create comprehensive tests for: $ARGUMENTS

## Backend Tests (pytest)
- Use `pytest-asyncio` for async test functions
- Use fixtures from `tests/conftest.py` for mock services
- Mock Composio with `unittest.mock.AsyncMock` — never call real APIs in tests
- Mock Groq responses with predefined tool call / text responses
- For LangGraph tests: invoke the compiled graph with a test state and assert on output
- For tool tests: mock the external API, test the tool function directly
- For API tests: use `httpx.AsyncClient` with the FastAPI test client

## Frontend Tests (vitest)
- Use React Testing Library for component tests
- Use MSW for API mocking
- Test user interactions (click, type, submit) not implementation details
- Test streaming behavior: verify messages appear progressively

## Rules
- Place backend tests in `backend/tests/` mirroring the source structure
- Place frontend tests next to components as `*.test.tsx`
- Every test function name describes what it tests: `test_gmail_tool_returns_messages_on_success`
- Include happy path, error cases, and edge cases
