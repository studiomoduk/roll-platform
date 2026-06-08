"""Orchestrates the pipeline for one order and writes status to production_jobs.

Status transitions (matching productionStatusEnum / the confirmation screen):

    queued → pattern_ready → nested → print_ready

The engine stops at `print_ready` — fixation, cutting, sewing, packing and
shipping are the human micro-factory steps, advanced from the admin board.
"""

from __future__ import annotations

import logging
from pathlib import Path

from ..config import settings
from ..db import JobContext, fetch_jobs_for_order, set_job_status, set_order_status
from . import alter, nest, pattern, print_layers, seam, work_order

log = logging.getLogger("palava.production")

_TRIMS = ["main-label", "swing-tag", "button-18mm ×3"]
_STEPS = [
    "Fix the print (heat-set / steam per cloth).",
    "Cut each piece on the printed cut line.",
    "Stitch on the printed sew line; match notches.",
    "Insert main label; attach swing tag.",
    "Press, fold, pack.",
]


def _load_artwork(url: str | None) -> bytes | None:
    if not url:
        return None
    # Local dev: artwork referenced like "fabrics/wildflower.png" under patterns_dir/..
    candidate = (settings.patterns_dir.parent / url).resolve()
    if candidate.exists():
        return candidate.read_bytes()
    return None


def run_order(order_id: str) -> None:
    jobs = fetch_jobs_for_order(order_id)
    if not jobs:
        log.warning("No production jobs for order %s", order_id)
        return

    set_order_status(order_id, "in_production")
    for job in jobs:
        try:
            _run_job(job)
        except Exception as exc:  # noqa: BLE001 — record failure on the job
            log.exception("Job %s failed", job.job_id)
            set_job_status(job.job_id, "failed", error=str(exc), completed=True)


def _run_job(job: JobContext) -> None:
    from ..storage import save_bytes

    set_job_status(job.job_id, "queued", started=True)

    # 1. retrieve graded pattern
    pieces = pattern.load_pieces(job.pattern_storage_url, job.pieces_meta)

    # 2. length alteration (Stage 2 only)
    if job.stage == 2 and job.length_adj_cm:
        pieces = [alter.apply_length(p, job.length_adj_cm) for p in pieces]

    # 3. seam allowance
    pieces = [seam.add_seam_allowance(p) for p in pieces]
    set_job_status(job.job_id, "pattern_ready")

    # 4. nest
    lay = nest.nest(pieces, job.cloth_width_cm)
    set_job_status(job.job_id, "nested")

    order_ref = f"#{job.order_id[:8]}"

    # 5 & 6. print layers → TIFF
    tiff = print_layers.render_lay(
        lay,
        px_per_cm=settings.px_per_cm,
        order_ref=order_ref,
        size_label=job.size,
        artwork_bytes=_load_artwork(job.print_artwork_url),
    )
    tiff_url = save_bytes(f"{job.order_id}/{job.job_id}/print.tiff", tiff)

    # 7. work order PDF
    fabric_metres = round(lay.length_cm / 100.0, 2)
    pdf = work_order.render_work_order(
        order_ref=order_ref,
        style_name=job.style_name,
        size_label=job.size,
        fabric_name=job.fabric_name,
        fabric_metres=fabric_metres,
        lay_length_cm=lay.length_cm,
        cloth_width_cm=lay.cloth_width_cm,
        trims=_TRIMS,
        steps=_STEPS,
    )
    pdf_url = save_bytes(f"{job.order_id}/{job.job_id}/work-order.pdf", pdf)

    set_job_status(
        job.job_id,
        "print_ready",
        print_file_url=tiff_url,
        work_order_url=pdf_url,
        completed=True,
    )
    log.info("Job %s print_ready (%.1f cm lay)", job.job_id, lay.length_cm)
