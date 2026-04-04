"""Image tool placeholders for future iterations."""

from langchain_core.tools import tool


@tool
async def inspect_image_file(file_path: str) -> str:
    """Report that image inspection is not implemented in Phase 1A."""
    return f"Image inspection is not implemented yet for: {file_path}"
