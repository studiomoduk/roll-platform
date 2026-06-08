"""Stage 4 — create the lay (nesting / marker making).

Nests all piece instances inside the fixed cloth width to minimise length used.
True marker-making is 2D irregular bin-packing (no-fit-polygon + optimisation;
libs: jagua-rs, SVGnest/Deepnest). For a single made-to-order garment the
problem is tiny, so this implements a simple, robust **shelf packer** on each
piece's bounding box: lay pieces left-to-right across the cloth width, wrapping
to a new shelf (row) when the width is exceeded. It's not optimal but it's
deterministic and good enough to ship a first lay; swap in an NFP nester later
without changing the interface.
"""

from __future__ import annotations

from .types import Piece, Placement, Lay

_GAP_CM = 1.0  # spacing between pieces on the lay


def nest(pieces: list[Piece], cloth_width_cm: float) -> Lay:
    # Expand each piece by its cut count into individual instances.
    instances: list[tuple[Piece, int]] = []
    for p in pieces:
        for i in range(1, p.cut + 1):
            instances.append((p, i))

    # Largest-first by bbox height tends to pack shelves tighter.
    def bbox(p: Piece) -> tuple[float, float, float, float]:
        geom = p.cut_line or p.sew_line
        return geom.bounds  # (minx, miny, maxx, maxy)

    instances.sort(key=lambda pi: bbox(pi[0])[3] - bbox(pi[0])[1], reverse=True)

    placements: list[Placement] = []
    shelf_x = 0.0
    shelf_y = 0.0
    shelf_height = 0.0

    for piece, inst in instances:
        minx, miny, maxx, maxy = bbox(piece)
        w = maxx - minx
        h = maxy - miny

        if shelf_x + w > cloth_width_cm and shelf_x > 0:
            # new shelf
            shelf_y += shelf_height + _GAP_CM
            shelf_x = 0.0
            shelf_height = 0.0

        # Translate so the piece's bbox origin sits at (shelf_x, shelf_y).
        dx = shelf_x - minx
        dy = shelf_y - miny
        placements.append(Placement(piece=piece, instance=inst, dx_cm=dx, dy_cm=dy))

        shelf_x += w + _GAP_CM
        shelf_height = max(shelf_height, h)

    length_cm = shelf_y + shelf_height
    return Lay(cloth_width_cm=cloth_width_cm, length_cm=length_cm, placements=placements)
