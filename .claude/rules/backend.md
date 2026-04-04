# Backend Rules (backend/)

Applies when Claude accesses any file under `backend/`.

- All code is async-first: use `async def`, `await`, `aiofiles`, `asyncpg`
- Every function has type hints on parameters and return type
- Use `structlog` for logging, never `print()`
- Use `pydantic.BaseModel` for all API request/response schemas
- Use `pydantic-settings` for configuration (env vars)
- SQL queries go through SQLAlchemy ORM, never raw SQL strings
- Composio entity IDs are resolved server-side, never passed from frontend
- Tool functions are decorated with `@tool` from langchain_core
- Cap all tool output to 10,000 chars to prevent context window overflow
- Use exponential backoff for external API calls (Groq, Composio)
