"""Unit tests for local tools."""

from __future__ import annotations

import pytest

from app.tools.code_tools import grep_workspace_code
from app.tools.file_tools import read_workspace_file, search_workspace_files


@pytest.mark.asyncio
async def test_read_workspace_file_returns_project_text() -> None:
    """The read tool should return file contents for a valid workspace path."""

    result = await read_workspace_file.ainvoke({"file_path": "CLAUDE.md"})

    assert "Omni Copilot" in result


@pytest.mark.asyncio
async def test_search_workspace_files_finds_matching_file_names() -> None:
    """The file search tool should find matching names within the workspace."""

    result = await search_workspace_files.ainvoke({"query": "CLAUDE"})

    assert "CLAUDE.md" in result


@pytest.mark.asyncio
async def test_grep_workspace_code_finds_known_pattern() -> None:
    """The code grep tool should find matching text in known files."""

    result = await grep_workspace_code.ainvoke({"pattern": "Omni Copilot", "directory": "."})

    assert "CLAUDE.md" in result
