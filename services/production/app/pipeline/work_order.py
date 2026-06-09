"""Stage 7 — work order PDF.

Alongside the print TIFF we emit a PDF the cutter/sewer follows: order ref,
style, size, fabric, fabric length needed (drives stock deduction), trims list,
and the cut/sew steps. Rendered with reportlab.
"""

from __future__ import annotations

from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas


def render_work_order(
    *,
    order_ref: str,
    style_name: str,
    size_label: str,
    fabric_name: str,
    fabric_metres: float,
    lay_length_cm: float,
    cloth_width_cm: float,
    trims: list[str],
    steps: list[str],
) -> bytes:
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4
    y = h - 2.5 * cm

    c.setFont("Helvetica-Bold", 18)
    c.drawString(2 * cm, y, "Palava — Work Order")
    y -= 1.0 * cm
    c.setFont("Helvetica", 11)
    c.drawString(2 * cm, y, f"Order {order_ref}")
    y -= 1.2 * cm

    def row(label: str, value: str) -> None:
        nonlocal y
        c.setFont("Helvetica-Bold", 11)
        c.drawString(2 * cm, y, f"{label}:")
        c.setFont("Helvetica", 11)
        c.drawString(6 * cm, y, value)
        y -= 0.7 * cm

    row("Style", style_name)
    row("Size", size_label)
    row("Fabric", fabric_name)
    row("Cloth width", f"{cloth_width_cm:.0f} cm")
    row("Lay length", f"{lay_length_cm:.1f} cm")
    row("Fabric needed", f"{fabric_metres:.2f} m")

    y -= 0.4 * cm
    c.setFont("Helvetica-Bold", 12)
    c.drawString(2 * cm, y, "Trims")
    y -= 0.7 * cm
    c.setFont("Helvetica", 11)
    for t in trims:
        c.drawString(2.4 * cm, y, f"• {t}")
        y -= 0.6 * cm

    y -= 0.4 * cm
    c.setFont("Helvetica-Bold", 12)
    c.drawString(2 * cm, y, "Cut & sew")
    y -= 0.7 * cm
    c.setFont("Helvetica", 11)
    for i, step in enumerate(steps, 1):
        c.drawString(2.4 * cm, y, f"{i}. {step}")
        y -= 0.6 * cm

    c.setFont("Helvetica-Oblique", 9)
    c.drawString(2 * cm, 1.5 * cm, "Cut lines, notches and labels are printed on the cloth.")
    c.showPage()
    c.save()
    return buf.getvalue()
