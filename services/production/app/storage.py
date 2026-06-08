"""Artifact storage.

Locally we write print TIFFs and work-order PDFs under `out/` and return a
file path (or a public URL if PUBLIC_BASE_URL is set). Swap `save_bytes` for an
S3/Supabase Storage upload in production — the rest of the pipeline doesn't care.
"""

from __future__ import annotations

from pathlib import Path

from .config import settings


def save_bytes(rel_path: str, data: bytes) -> str:
    """Persist bytes and return a URL/locator for the DB."""
    dest = settings.out_dir / rel_path
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    if settings.public_base_url:
        return f"{settings.public_base_url.rstrip('/')}/{rel_path}"
    return dest.resolve().as_uri()


def save_file(rel_path: str, src: Path) -> str:
    return save_bytes(rel_path, src.read_bytes())
