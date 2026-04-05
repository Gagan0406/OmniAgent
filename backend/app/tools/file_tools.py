"""Local workspace file tools."""

from __future__ import annotations

import asyncio
from pathlib import Path

from langchain_core.tools import tool

from app.config import settings

MAX_TOOL_OUTPUT_CHARS = 10_000


def _truncate_output(content: str) -> str:
    """Cap tool output to keep responses model-friendly."""

    return content[:MAX_TOOL_OUTPUT_CHARS]


def _resolve_workspace_path(path_str: str) -> Path:
    """Resolve a path inside the configured workspace root."""

    workspace_root = settings.workspace_root.resolve()
    candidate = Path(path_str)
    resolved_path = (
        candidate.resolve() if candidate.is_absolute() else (workspace_root / candidate).resolve()
    )

    try:
        resolved_path.relative_to(workspace_root)
    except ValueError as exc:
        msg = f"Path escapes the workspace root: {path_str}"
        raise ValueError(msg) from exc

    return resolved_path


@tool
async def read_workspace_file(file_path: str) -> str:
    """Read a UTF-8 text file from the workspace.

    Args:
        file_path: Path to a text file.
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
        directory: Directory to search.
    """

    lowered_query = query.lower()
    search_root = _resolve_workspace_path(directory)

    def _search_files() -> list[str]:
        matches: list[str] = []
        for path in search_root.rglob("*"):
            if path.is_file() and lowered_query in path.name.lower():
                matches.append(str(path.relative_to(search_root)))
        return sorted(matches)

    matches = await asyncio.to_thread(_search_files)

    if not matches:
        return f"No files found for query: {query}"

    # Remove duplicates and sort
    unique_matches = sorted(list(set(matches)))
    return _truncate_output("\n".join(unique_matches))
