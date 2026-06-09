"""Stage 2 — apply the length alteration.

Moves the hemline along the piece's lengthen/shorten line by `length_adj_cm`.
We model the L/S line as a horizontal line at y = `lengthen_shorten_y` (cm),
with +y pointing toward the hem. Every vertex below the line is translated by
`length_adj_cm` in +y; vertices above stay put. This lengthens (positive) or
shortens (negative) the piece while preserving the bodice.

Capped to the style's Stage-2 range upstream (the web app enforces ±range);
here we just apply it. For pieces without an L/S line we no-op.
"""

from __future__ import annotations

from shapely.geometry import Polygon

from .types import Piece


def apply_length(piece: Piece, length_adj_cm: float) -> Piece:
    if not length_adj_cm or piece.lengthen_shorten_y is None:
        return piece

    ls_y = piece.lengthen_shorten_y
    moved = [
        (x, y + length_adj_cm) if y >= ls_y else (x, y)
        for (x, y) in piece.sew_line.exterior.coords
    ]
    piece.sew_line = Polygon(moved)
    return piece
