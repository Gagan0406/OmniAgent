"""Code inspection tools."""

from __future__ import annotations

import asyncio
from pathlib import Path

from langchain_core.tools import tool

from app.config import settings

CODE_FILE_EXTENSIONS = {".py", ".ts", ".tsx", ".js", ".jsx", ".md"}
MAX_TOOL_OUTPUT_CHARS = 10_000


def _resolve_workspace_path(path_str: str) -> Path:
    """Resolve a directory inside the configured workspace root."""

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
async def grep_workspace_code(pattern: str, directory: str = ".") -> str:
    """Search code files for a plain-text pattern.

    Args:
        pattern: Plain-text text to search for.
        directory: Directory to search.
    """

    lowered_pattern = pattern.lower()
    search_root = _resolve_workspace_path(directory)

    def _grep_files() -> list[str]:
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
                    relative_path = path.relative_to(search_root)
                    matches.append(f"{relative_path}:{line_number}: {line.strip()}")

        return matches

    matches = await asyncio.to_thread(_grep_files)

    if not matches:
        return f"No code matches found for pattern: {pattern}"

    return "\n".join(matches)[:MAX_TOOL_OUTPUT_CHARS]
