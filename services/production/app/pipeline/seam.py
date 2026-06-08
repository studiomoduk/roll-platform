"""Stage 3 — add seam allowance.

Offsets each piece's sew line outward to produce the cut line (polygon buffer).
We use Shapely's `.buffer()` (GEOS) with a mitre join so corners stay crisp.
The sew line and the cut line are kept as two layers (SPEC §2.3): the cut line
is the offset outer edge the cutter follows; the sew line is where it's stitched.

A single uniform offset is used here. For a true variable allowance (more at the
hem) you'd buffer per-edge; that's a straightforward extension using the L/S
line to identify hem edges.
"""

from __future__ import annotations

from shapely.geometry import Polygon

from .types import Piece


def add_seam_allowance(piece: Piece) -> Piece:
    allowance = max(piece.seam_allowance_cm, piece.hem_allowance_cm)
    cut = piece.sew_line.buffer(
        allowance, join_style=2, mitre_limit=5.0
    )  # join_style 2 = mitre
    if cut.geom_type != "Polygon":
        cut = cut.convex_hull
    piece.cut_line = Polygon(cut.exterior)
    return piece
