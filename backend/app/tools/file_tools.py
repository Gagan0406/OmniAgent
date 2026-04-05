"""Local workspace file tools."""

from __future__ import annotations

import asyncio
from pathlib import Path

from langchain_core.tools import tool

MAX_TOOL_OUTPUT_CHARS = 10_000


def _truncate_output(content: str) -> str:
    """Cap tool output to keep responses model-friendly."""

    return content[:MAX_TOOL_OUTPUT_CHARS]


@tool
async def read_workspace_file(file_path: str) -> str:
    """Read a UTF-8 text file from the workspace.

    Args:
        file_path: Path to a text file.
    """

    # For now, assume files are in the current working directory
    # This can be made configurable later
    resolved_path = Path(file_path).resolve()

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
    search_root = Path(directory).resolve()

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
