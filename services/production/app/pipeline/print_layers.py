"""Stages 5 & 6 — generate print layers and export for the printer.

For each nested piece we composite three layers (SPEC §2.5) onto one raster
sized to the cloth (width = cloth width, length = nested lay length), at the
RIP resolution (~150 dpi for textile):

  * Print layer       — decorative artwork clipped to the piece's CUT polygon.
                        All-over repeat (tiled) or engineered placement.
  * White knock-out   — white sits under the instruction marks so they read
                        cleanly over the print.
  * Instruction layer — cut line, sew line, grain arrow, notches, and the piece
                        label ("Bodice front · cut 2"), size + order number,
                        drawn INSIDE the seam allowance so the marks vanish into
                        the seam after sewing.

The result is a single TIFF the printer's RIP can lay down in one pass — no
separate marker paper; the cutter follows the printed cut lines.
"""

from __future__ import annotations

from io import BytesIO

from PIL import Image, ImageDraw, ImageFont
from shapely.affinity import translate
from shapely.geometry import Polygon

from .types import Lay, Placement


# Muted fallback "print" if a fabric has no artwork bitmap yet.
_FALLBACK_PRINT = (231, 221, 201)  # sand
_CUT_LINE = (40, 38, 34)
_SEW_LINE = (150, 105, 74)
_TEXT = (40, 38, 34)


def _px(cm: float, px_per_cm: float) -> int:
    return int(round(cm * px_per_cm))


def _poly_to_px(poly: Polygon, px_per_cm: float) -> list[tuple[int, int]]:
    return [(_px(x, px_per_cm), _px(y, px_per_cm)) for x, y in poly.exterior.coords]


def _load_artwork(artwork_bytes: bytes | None) -> Image.Image | None:
    if not artwork_bytes:
        return None
    try:
        return Image.open(BytesIO(artwork_bytes)).convert("RGB")
    except Exception:
        return None


def _tiled_print(size: tuple[int, int], tile: Image.Image | None) -> Image.Image:
    """All-over repeat across the whole cloth."""
    canvas = Image.new("RGB", size, _FALLBACK_PRINT)
    if tile is None:
        return canvas
    tw, th = tile.size
    for y in range(0, size[1], th):
        for x in range(0, size[0], tw):
            canvas.paste(tile, (x, y))
    return canvas


def _font(px: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    try:
        return ImageFont.truetype("DejaVuSans.ttf", px)
    except Exception:
        return ImageFont.load_default()


def _engineered_print(
    size: tuple[int, int],
    lay: Lay,
    art: Image.Image | None,
    px_per_cm: float,
) -> Image.Image:
    """Engineered placement: one artwork instance positioned per piece, scaled to
    cover the piece's bounding box and clipped to its cut polygon."""
    canvas = Image.new("RGB", size, _FALLBACK_PRINT)
    if art is None:
        return canvas
    for pl in lay.placements:
        cut = pl.piece.cut_line or pl.piece.sew_line
        cut = translate(cut, xoff=pl.dx_cm, yoff=pl.dy_cm)
        minx, miny, maxx, maxy = cut.bounds
        w = max(_px(maxx - minx, px_per_cm), 1)
        h = max(_px(maxy - miny, px_per_cm), 1)
        placed = art.resize((w, h))
        piece_mask = Image.new("L", (w, h), 0)
        local = translate(cut, xoff=-minx, yoff=-miny)
        ImageDraw.Draw(piece_mask).polygon(_poly_to_px(local, px_per_cm), fill=255)
        canvas.paste(placed, (_px(minx, px_per_cm), _px(miny, px_per_cm)), piece_mask)
    return canvas


def render_lay(
    lay: Lay,
    *,
    px_per_cm: float,
    order_ref: str,
    size_label: str,
    artwork_bytes: bytes | None = None,
    print_mode: str = "repeat",
) -> bytes:
    width_px = _px(lay.cloth_width_cm, px_per_cm)
    height_px = max(_px(lay.length_cm, px_per_cm), 1)

    art = _load_artwork(artwork_bytes)

    # --- Print layer ---------------------------------------------------------
    if print_mode == "engineered":
        # Each piece already carries its own clipped placement.
        cloth = Image.new("RGB", (width_px, height_px), (255, 255, 255))
        engineered = _engineered_print((width_px, height_px), lay, art, px_per_cm)
        full_mask = Image.new("L", (width_px, height_px), 0)
        mdraw = ImageDraw.Draw(full_mask)
        for pl in lay.placements:
            cut = translate(
                pl.piece.cut_line or pl.piece.sew_line, xoff=pl.dx_cm, yoff=pl.dy_cm
            )
            mdraw.polygon(_poly_to_px(cut, px_per_cm), fill=255)
        cloth.paste(engineered, (0, 0), full_mask)
    else:
        # All-over repeat tiled across the cloth, masked to the union of pieces.
        print_layer = _tiled_print((width_px, height_px), art)
        mask = Image.new("L", (width_px, height_px), 0)
        mask_draw = ImageDraw.Draw(mask)
        for pl in lay.placements:
            cut = pl.piece.cut_line or pl.piece.sew_line
            cut = translate(cut, xoff=pl.dx_cm, yoff=pl.dy_cm)
            mask_draw.polygon(_poly_to_px(cut, px_per_cm), fill=255)
        cloth = Image.new("RGB", (width_px, height_px), (255, 255, 255))
        cloth.paste(print_layer, (0, 0), mask)

    draw = ImageDraw.Draw(cloth)
    label_font = _font(_px(0.7, px_per_cm))
    small_font = _font(_px(0.45, px_per_cm))

    for pl in lay.placements:
        _draw_piece(
            draw,
            pl,
            px_per_cm=px_per_cm,
            order_ref=order_ref,
            size_label=size_label,
            label_font=label_font,
            small_font=small_font,
        )

    buf = BytesIO()
    # Textile RIPs take TIFF; set DPI so physical size is correct.
    cloth.save(buf, format="TIFF", dpi=(px_per_cm * 2.54, px_per_cm * 2.54))
    return buf.getvalue()


def _draw_piece(
    draw: ImageDraw.ImageDraw,
    pl: Placement,
    *,
    px_per_cm: float,
    order_ref: str,
    size_label: str,
    label_font,
    small_font,
) -> None:
    piece = pl.piece
    sew = translate(piece.sew_line, xoff=pl.dx_cm, yoff=pl.dy_cm)
    cut = translate(piece.cut_line or piece.sew_line, xoff=pl.dx_cm, yoff=pl.dy_cm)

    cut_px = _poly_to_px(cut, px_per_cm)
    sew_px = _poly_to_px(sew, px_per_cm)

    # White knock-out band just inside the cut line so marks read over the print.
    draw.line(cut_px + [cut_px[0]], fill=(255, 255, 255), width=_px(0.5, px_per_cm))

    # Instruction layer: cut line (solid) + sew line (dashed-ish).
    draw.line(cut_px + [cut_px[0]], fill=_CUT_LINE, width=max(1, _px(0.08, px_per_cm)))
    draw.line(sew_px + [sew_px[0]], fill=_SEW_LINE, width=max(1, _px(0.05, px_per_cm)))

    # Grain arrow (vertical) through the piece centroid.
    cx, cy = cut.centroid.x, cut.centroid.y
    miny = cut.bounds[1] + 1.0
    maxy = cut.bounds[3] - 1.0
    draw.line(
        [(_px(cx, px_per_cm), _px(miny, px_per_cm)),
         (_px(cx, px_per_cm), _px(maxy, px_per_cm))],
        fill=_TEXT,
        width=max(1, _px(0.06, px_per_cm)),
    )

    # Piece label, size, order ref — placed inside the seam allowance near top.
    text = f"{piece.label} · cut {piece.cut}"
    sub = f"{order_ref} · {size_label}"
    tx = _px(cut.bounds[0] + 0.6, px_per_cm)
    ty = _px(cut.bounds[1] + 0.4, px_per_cm)
    draw.text((tx, ty), text, fill=_TEXT, font=label_font)
    draw.text((tx, ty + _px(0.8, px_per_cm)), sub, fill=_TEXT, font=small_font)
