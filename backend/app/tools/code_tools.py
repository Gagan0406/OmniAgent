"""Code inspection tools."""

from __future__ import annotations

import asyncio

from langchain_core.tools import tool

from app.config import settings
from app.tools.file_tools import MAX_TOOL_OUTPUT_CHARS, _resolve_workspace_path

CODE_FILE_EXTENSIONS = {".py", ".ts", ".tsx", ".js", ".jsx", ".md"}


@tool
async def grep_workspace_code(pattern: str, directory: str = ".") -> str:
    """Search code files for a plain-text pattern.

    Args:
        pattern: Plain-text text to search for.
        directory: Relative directory within the workspace to search.
    """

    search_root = _resolve_workspace_path(directory)
    workspace_root = settings.workspace_root.resolve()
    lowered_pattern = pattern.lower()

    def _grep() -> list[str]:
        matches: list[str] = []
        for path in search_root.rglob("*"):
            if not path.is_file() or path.suffix.lower() not in CODE_FILE_EXTENSIONS:
                continue

            try:
                content = path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                continue

            for line_number, line in enumerate(content.splitlines(), start=1):
                if lowered_pattern in line.lower():
                    relative_path = path.relative_to(workspace_root)
                    matches.append(f"{relative_path}:{line_number}: {line.strip()}")

        return matches

    matches = await asyncio.to_thread(_grep)
    if not matches:
        return f"No code matches found for pattern: {pattern}"

    return "\n".join(matches)[:MAX_TOOL_OUTPUT_CHARS]
