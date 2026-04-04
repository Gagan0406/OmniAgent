# Test Rules (backend/tests/ and frontend/**/*.test.*)

Applies when Claude accesses test files.

- Never call real external APIs (Composio, Groq, Google, Slack) in tests
- Use `conftest.py` fixtures for all shared mocks and test data
- Test naming: `test_<what>_<condition>_<expected_result>`
- One concept per test — multiple asserts OK if testing the same behavior
- Backend: use `pytest.mark.asyncio` for async tests
- Backend: use `httpx.AsyncClient` for API endpoint tests
- Frontend: use `userEvent` over `fireEvent` for realistic interactions
- Frontend: use MSW for API mocking
- Prefer testing behavior over testing implementation
- If testing LangGraph: invoke the full compiled graph, assert on output state
- If testing a tool: mock the external service, test the tool function directly
