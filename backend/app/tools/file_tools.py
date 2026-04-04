"""Local workspace file tools."""

from __future__ import annotations

import asyncio
from pathlib import Path

from langchain_core.tools import tool

from app.config import settings

MAX_TOOL_OUTPUT_CHARS = 10_000


def _resolve_workspace_path(relative_path: str) -> Path:
    """Resolve a workspace path and block traversal outside the repository root."""

    workspace_root = settings.workspace_root.resolve()
    candidate = (workspace_root / relative_path).resolve()

    if not candidate.is_relative_to(workspace_root):
        msg = "Path must stay within the workspace root."
        raise ValueError(msg)

    return candidate


def _truncate_output(content: str) -> str:
    """Cap tool output to keep responses model-friendly."""

    return content[:MAX_TOOL_OUTPUT_CHARS]


@tool
async def read_workspace_file(file_path: str) -> str:
    """Read a UTF-8 text file from the workspace.

    Args:
        file_path: Relative path to a text file inside the workspace.
    """

    resolved_path = _resolve_workspace_path(file_path)

    if not resolved_path.is_file():
        msg = f"File not found: {file_path}"
        raise FileNotFoundError(msg)

    content = await asyncio.to_thread(resolved_path.read_text, encoding="utf-8")
    return _truncate_output(content)


@tool
async def search_workspace_files(query: str, directory: str = ".") -> str:
    """Search workspace file names for a case-insensitive query.

    Args:
        query: Text to search for in file names.
        directory: Relative directory within the workspace to search.
    """

    search_root = _resolve_workspace_path(directory)
    workspace_root = settings.workspace_root.resolve()
    lowered_query = query.lower()

    def _search() -> list[str]:
        return sorted(
            str(path.relative_to(workspace_root))
            for path in search_root.rglob("*")
            if path.is_file() and lowered_query in path.name.lower()
        )

    matches = await asyncio.to_thread(_search)
    if not matches:
        return f"No files found for query: {query}"

    return _truncate_output("\n".join(matches))
