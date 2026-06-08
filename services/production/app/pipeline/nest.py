"""Stage 4 — create the lay (nesting / marker making).

Nests all piece instances inside the fixed cloth width to minimise the length
used. True marker-making is 2D irregular bin-packing (no-fit-polygon +
optimisation; libs: jagua-rs, SVGnest/Deepnest). This implements a grain-safe
**skyline bottom-left-fill** on each piece's bounding box:

  * pieces are placed by TRANSLATION ONLY — never rotated — because apparel
    grain must run along the cloth, so a 90° turn is not allowed;
  * a "skyline" (the current upper profile of placed pieces across the width)
    is tracked, and each piece is dropped into the lowest, left-most position
    where its width fits.

This packs noticeably tighter than naive shelves while staying correct. Swap in
a polygon NFP nester later without changing this function's interface.
"""

from __future__ import annotations

from .types import Piece, Placement, Lay

_GAP_CM = 1.0  # spacing between pieces on the lay


def _bbox(p: Piece) -> tuple[float, float, float, float]:
    return (p.cut_line or p.sew_line).bounds  # (minx, miny, maxx, maxy)


def nest(pieces: list[Piece], cloth_width_cm: float) -> Lay:
    # Expand each piece by its cut count into individual instances.
    instances: list[tuple[Piece, int]] = []
    for p in pieces:
        for i in range(1, p.cut + 1):
            instances.append((p, i))

    # Tallest first packs the skyline more evenly.
    instances.sort(key=lambda pi: _bbox(pi[0])[3] - _bbox(pi[0])[1], reverse=True)

    # Skyline as nodes: list of (x, height) describing the upper profile across
    # [0, cloth_width]. Starts flat at 0.
    skyline: list[tuple[float, float]] = [(0.0, 0.0)]
    placements: list[Placement] = []

    def height_over(x0: float, w: float) -> float:
        """Max skyline height spanning [x0, x0+w]."""
        x1 = x0 + w
        h = 0.0
        for i, (sx, sh) in enumerate(skyline):
            nx = skyline[i + 1][0] if i + 1 < len(skyline) else cloth_width_cm
            if nx <= x0 or sx >= x1:
                continue
            h = max(h, sh)
        return h

    def candidate_xs() -> list[float]:
        return [sx for (sx, _) in skyline]

    def place(w: float, h: float) -> tuple[float, float]:
        """Choose the lowest, then left-most x where the piece fits."""
        best_x, best_y = 0.0, float("inf")
        for x0 in candidate_xs():
            if x0 + w > cloth_width_cm + 1e-6:
                continue
            y = height_over(x0, w)
            if y < best_y - 1e-9 or (abs(y - best_y) < 1e-9 and x0 < best_x):
                best_x, best_y = x0, y
        if best_y == float("inf"):
            # Wider than the cloth — place at origin on a fresh row (best effort).
            best_x, best_y = 0.0, max((sh for _, sh in skyline), default=0.0)
        return best_x, best_y

    def raise_skyline(x0: float, w: float, top: float) -> None:
        """Set the skyline to `top` across [x0, x0+w], merging nodes."""
        x1 = x0 + w
        new: list[tuple[float, float]] = []
        i = 0
        # Keep nodes left of x0.
        while i < len(skyline) and skyline[i][0] < x0:
            new.append(skyline[i])
            i += 1
        # Height just before x0 (for the segment we're about to overwrite).
        prior = new[-1][1] if new else 0.0
        new.append((x0, top))
        # Find height at x1 (to restore after the raised segment).
        h_at_x1 = prior
        for sx, sh in skyline:
            if sx <= x1:
                h_at_x1 = sh
            else:
                break
        # Drop nodes covered by [x0, x1].
        while i < len(skyline) and skyline[i][0] < x1 - 1e-9:
            i += 1
        if x1 < cloth_width_cm - 1e-9:
            new.append((x1, h_at_x1))
        new.extend(skyline[i:])
        # Deduplicate consecutive equal heights.
        merged: list[tuple[float, float]] = []
        for node in new:
            if merged and abs(merged[-1][1] - node[1]) < 1e-9:
                continue
            merged.append(node)
        skyline[:] = merged

    for piece, inst in instances:
        minx, miny, maxx, maxy = _bbox(piece)
        w = maxx - minx
        h = maxy - miny
        x0, y0 = place(w + _GAP_CM, h)
        # Translate so the piece bbox origin sits at (x0, y0).
        placements.append(
            Placement(piece=piece, instance=inst, dx_cm=x0 - minx, dy_cm=y0 - miny)
        )
        raise_skyline(x0, w + _GAP_CM, y0 + h + _GAP_CM)

    length_cm = max((sh for _, sh in skyline), default=0.0)
    return Lay(
        cloth_width_cm=cloth_width_cm, length_cm=length_cm, placements=placements
    )
