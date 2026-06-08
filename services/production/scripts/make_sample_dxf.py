"""Generate a sample DXF-style graded pattern for the Quince Pinafore.

Writes patterns/quince-v1.dxf with one closed LWPOLYLINE per piece, each on its
own layer (the layer name is the piece id the engine reads). Units are
centimetres ($INSUNITS = 5). Run from the repo root:

    python services/production/scripts/make_sample_dxf.py
"""

from __future__ import annotations

from pathlib import Path

import ezdxf

# piece id (layer) -> closed outline in centimetres
PIECES = {
    "bib-front": [(0, 0), (24, 0), (24, 30), (12, 36), (0, 30)],
    "bib-back": [(30, 0), (54, 0), (54, 30), (42, 36), (30, 30)],
    "skirt-front": [(60, 0), (132, 0), (140, 70), (56, 70)],
}


def main() -> None:
    out = Path(__file__).resolve().parents[3] / "patterns" / "quince-v1.dxf"
    doc = ezdxf.new(dxfversion="R2010")
    doc.header["$INSUNITS"] = 5  # centimetres
    msp = doc.modelspace()
    for layer, pts in PIECES.items():
        doc.layers.add(layer)
        msp.add_lwpolyline(pts, close=True, dxfattribs={"layer": layer})
    out.parent.mkdir(parents=True, exist_ok=True)
    doc.saveas(out)
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
