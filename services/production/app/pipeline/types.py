from __future__ import annotations

from dataclasses import dataclass, field
from shapely.geometry import Polygon


@dataclass
class Piece:
    """A single pattern piece, geometry in centimetres.

    `sew_line` is the original cut-on-the-stitch polygon; `cut_line` is the
    outer offset edge (sew_line + seam allowance). Both are kept so the engine
    can print the cut guide and the (hidden) stitch line.
    """

    id: str
    label: str
    cut: int  # how many to cut, e.g. 2
    seam_allowance_cm: float
    hem_allowance_cm: float
    sew_line: Polygon
    cut_line: Polygon | None = None
    # Lengthen/shorten line as y in cm (horizontal). None = no Stage-2 support.
    lengthen_shorten_y: float | None = None


@dataclass
class Placement:
    """A piece instance placed on the lay."""

    piece: Piece
    instance: int  # 1..cut
    dx_cm: float
    dy_cm: float


@dataclass
class Lay:
    cloth_width_cm: float
    length_cm: float
    placements: list[Placement] = field(default_factory=list)
