"""DXF-AAMA/ASTM pattern import (SPEC §2, stage 1).

Reads a DXF and returns the same `Piece` objects the rest of the pipeline
consumes, so SVG and DXF patterns are interchangeable. We read closed
LWPOLYLINE / POLYLINE entities; each piece lives on its own layer, and the
layer name is the piece id. Per-piece metadata (label, cut count, seam/hem
allowance, lengthen/shorten line) comes from the DB `pieces_meta` keyed by
piece id, since the apparel-CAD layer conventions for those vary by house.

Coordinates are converted to centimetres using the DXF header `$INSUNITS`
(4 = mm, 5 = cm, 1 = inch); unknown units are assumed to already be cm.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import ezdxf
from shapely.geometry import Polygon

from .types import Piece

# $INSUNITS code → centimetres-per-unit.
_UNIT_TO_CM = {
    1: 2.54,  # inch
    4: 0.1,  # mm
    5: 1.0,  # cm
    6: 100.0,  # m
}


def _scale_for(doc: ezdxf.document.Drawing) -> float:
    code = int(doc.header.get("$INSUNITS", 0) or 0)
    return _UNIT_TO_CM.get(code, 1.0)


def _polyline_points(entity) -> list[tuple[float, float]]:
    dxftype = entity.dxftype()
    if dxftype == "LWPOLYLINE":
        return [(p[0], p[1]) for p in entity.get_points("xy")]
    if dxftype == "POLYLINE":
        return [(v.dxf.location.x, v.dxf.location.y) for v in entity.vertices]
    return []


def load_pieces(path: Path, pieces_meta: dict[str, Any] | None) -> list[Piece]:
    doc = ezdxf.readfile(str(path))
    scale = _scale_for(doc)
    msp = doc.modelspace()

    meta_by_id: dict[str, dict[str, Any]] = {}
    if pieces_meta and isinstance(pieces_meta.get("pieces"), list):
        for m in pieces_meta["pieces"]:
            meta_by_id[m["id"]] = m

    pieces: list[Piece] = []
    for entity in msp.query("LWPOLYLINE POLYLINE"):
        if hasattr(entity, "closed") and not entity.closed:
            # Skip open polylines (grain lines, internal markings handled via meta).
            continue
        raw = _polyline_points(entity)
        if len(raw) < 3:
            continue
        pts = [(x * scale, y * scale) for (x, y) in raw]
        poly = Polygon(pts)
        if not poly.is_valid:
            poly = poly.buffer(0)
            if poly.geom_type != "Polygon":
                continue

        pid = entity.dxf.layer or f"piece-{len(pieces)}"
        m = meta_by_id.get(pid, {})
        label = m.get("label") or pid
        cut = int(m.get("cut") or 1)
        seam = float(m.get("seamAllowanceCm") or 1.0)
        hem = float(m.get("hemAllowanceCm") or seam)
        ls_y = None
        ls = m.get("lengthenShortenLine")
        if ls and "from" in ls:
            ls_y = float(ls["from"][1])

        pieces.append(
            Piece(
                id=pid,
                label=label,
                cut=cut,
                seam_allowance_cm=seam,
                hem_allowance_cm=hem,
                sew_line=Polygon(poly.exterior),
                lengthen_shorten_y=ls_y,
            )
        )

    if not pieces:
        raise ValueError(f"No closed polyline pieces found in {path}")
    return pieces
