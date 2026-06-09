"""Stage 1 — retrieve the graded pattern.

We support a simple SVG dialect where each piece is a `<polygon>` whose points
are in centimetres, annotated with data-* attributes:

    <polygon id="bodice-front"
             data-label="Bodice front"
             data-cut="2"
             data-seam="1.0"
             data-hem="2.5"
             data-ls-y="40"
             points="0,0 30,0 30,55 0,55" />

`data-ls-y` is the lengthen/shorten line (a horizontal line at y cm). Real DXF
AAMA/ASTM import (via ezdxf) would replace `load_pieces_from_svg` and produce
the same `Piece` objects; everything downstream is format-agnostic.

`pieces_meta` from the DB (per-piece seam allowance / "cut N" / L-S line) takes
precedence over the SVG attributes when present.
"""

from __future__ import annotations

import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

from shapely.geometry import Polygon

from ..config import settings
from .types import Piece

_SVG_NS = "{http://www.w3.org/2000/svg}"


def _parse_points(raw: str) -> list[tuple[float, float]]:
    pts: list[tuple[float, float]] = []
    # Robustly handle "x,y x,y" or "x y x y".
    tokens = raw.replace(",", " ").split()
    nums = [float(t) for t in tokens]
    for i in range(0, len(nums) - 1, 2):
        pts.append((nums[i], nums[i + 1]))
    return pts


def _resolve_pattern_path(storage_url: str | None) -> Path:
    """Map a pattern_files.storage_url to a local sample file.

    `storage_url` like "patterns/daphne-v1.svg" resolves under patterns_dir.
    In production this would download from object storage instead.
    """
    name = (storage_url or "patterns/daphne-v1.svg").split("/")[-1]
    return (settings.patterns_dir / name).resolve()


def load_pieces(
    storage_url: str | None,
    pieces_meta: dict[str, Any] | None,
    fmt: str | None = None,
) -> list[Piece]:
    """Format-dispatching loader. `fmt` ('svg'|'dxf') wins; otherwise we infer
    from the file extension. DXF goes through ezdxf; SVG through the parser below.
    """
    path = _resolve_pattern_path(storage_url)
    if not path.exists():
        raise FileNotFoundError(f"Pattern file not found: {path}")

    chosen = (fmt or path.suffix.lstrip(".")).lower()
    if chosen == "dxf":
        from . import dxf

        return dxf.load_pieces(path, pieces_meta)
    return _load_pieces_from_svg(path, pieces_meta)


def _load_pieces_from_svg(
    path: Path,
    pieces_meta: dict[str, Any] | None,
) -> list[Piece]:
    tree = ET.parse(path)
    root = tree.getroot()

    meta_by_id: dict[str, dict[str, Any]] = {}
    if pieces_meta and isinstance(pieces_meta.get("pieces"), list):
        for m in pieces_meta["pieces"]:
            meta_by_id[m["id"]] = m

    pieces: list[Piece] = []
    for el in root.iter():
        if not el.tag.endswith("polygon"):
            continue
        pid = el.get("id") or el.get("data-piece") or f"piece-{len(pieces)}"
        pts = _parse_points(el.get("points", ""))
        if len(pts) < 3:
            continue
        poly = Polygon(pts)

        m = meta_by_id.get(pid, {})
        label = m.get("label") or el.get("data-label") or pid
        cut = int(m.get("cut") or el.get("data-cut") or 1)
        seam = float(m.get("seamAllowanceCm") or el.get("data-seam") or 1.0)
        hem = float(m.get("hemAllowanceCm") or el.get("data-hem") or seam)

        ls_y: float | None = None
        ls = m.get("lengthenShortenLine")
        if ls and "from" in ls:
            ls_y = float(ls["from"][1])
        elif el.get("data-ls-y") is not None:
            ls_y = float(el.get("data-ls-y"))

        pieces.append(
            Piece(
                id=pid,
                label=label,
                cut=cut,
                seam_allowance_cm=seam,
                hem_allowance_cm=hem,
                sew_line=poly,
                lengthen_shorten_y=ls_y,
            )
        )

    if not pieces:
        raise ValueError(f"No <polygon> pieces found in {svg_path}")
    return pieces
