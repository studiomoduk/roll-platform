"""Thin Postgres access layer for the production engine.

The engine reads order/order_item/style/fabric/pattern rows and writes job
status back to `production_jobs` — the same table the web app's confirmation
screen and admin board read from. We use psycopg directly (no ORM) to keep the
service light.
"""

from __future__ import annotations

from contextlib import contextmanager
from dataclasses import dataclass
from typing import Any, Iterator
from datetime import datetime, timezone

import psycopg
from psycopg.rows import dict_row

from .config import settings


@contextmanager
def connect() -> Iterator[psycopg.Connection]:
    if not settings.database_url:
        raise RuntimeError("DATABASE_URL is not set for the production engine.")
    with psycopg.connect(settings.database_url, row_factory=dict_row) as conn:
        yield conn


@dataclass
class JobContext:
    """Everything a single production job needs, joined up from the order."""

    job_id: str
    order_id: str
    order_item_id: str
    style_id: str
    style_name: str
    style_kind: str
    base_length_cm: float
    fabric_id: str
    fabric_name: str
    print_artwork_url: str | None
    print_mode: str
    cloth_width_cm: float
    size: str
    stage: int
    length_adj_cm: float
    pattern_format: str | None
    pattern_storage_url: str | None
    pieces_meta: dict[str, Any] | None


def fetch_jobs_for_order(order_id: str) -> list[JobContext]:
    """Return one JobContext per production_job belonging to the order."""
    sql = """
        select
            pj.id            as job_id,
            o.id             as order_id,
            oi.id            as order_item_id,
            s.id             as style_id,
            s.name           as style_name,
            s.kind           as style_kind,
            coalesce(s.base_length_cm, 100) as base_length_cm,
            f.id             as fabric_id,
            f.name           as fabric_name,
            f.print_artwork_url,
            coalesce(f.print_mode, 'repeat') as print_mode,
            coalesce(f.width_cm, 150) as cloth_width_cm,
            oi.size,
            oi.stage,
            coalesce(oi.length_adj_cm, 0) as length_adj_cm,
            pf.format        as pattern_format,
            pf.storage_url   as pattern_storage_url,
            pf.pieces_meta
        from production_jobs pj
        join order_items oi on oi.id = pj.order_item_id
        join orders o       on o.id = oi.order_id
        join styles s       on s.id = oi.style_id
        join fabrics f      on f.id = oi.fabric_id
        left join lateral (
            select format, storage_url, pieces_meta
            from pattern_files
            where style_id = s.id
            order by version desc
            limit 1
        ) pf on true
        where o.id = %s
    """
    with connect() as conn:
        rows = conn.execute(sql, (order_id,)).fetchall()
    return [
        JobContext(
            job_id=str(r["job_id"]),
            order_id=str(r["order_id"]),
            order_item_id=str(r["order_item_id"]),
            style_id=str(r["style_id"]),
            style_name=r["style_name"],
            style_kind=r["style_kind"],
            base_length_cm=float(r["base_length_cm"]),
            fabric_id=str(r["fabric_id"]),
            fabric_name=r["fabric_name"],
            print_artwork_url=r["print_artwork_url"],
            print_mode=r["print_mode"],
            cloth_width_cm=float(r["cloth_width_cm"]),
            size=r["size"],
            stage=int(r["stage"]),
            length_adj_cm=float(r["length_adj_cm"]),
            pattern_format=r["pattern_format"],
            pattern_storage_url=r["pattern_storage_url"],
            pieces_meta=r["pieces_meta"],
        )
        for r in rows
    ]


def fetch_queued_jobs(limit: int = 10) -> list[str]:
    """Order ids that still have queued jobs — used by the polling worker."""
    sql = """
        select distinct o.id as order_id
        from production_jobs pj
        join order_items oi on oi.id = pj.order_item_id
        join orders o on o.id = oi.order_id
        where pj.status = 'queued'
        order by o.id
        limit %s
    """
    with connect() as conn:
        rows = conn.execute(sql, (limit,)).fetchall()
    return [str(r["order_id"]) for r in rows]


def set_job_status(
    job_id: str,
    status: str,
    *,
    print_file_url: str | None = None,
    work_order_url: str | None = None,
    error: str | None = None,
    started: bool = False,
    completed: bool = False,
) -> None:
    sets = ["status = %(status)s"]
    params: dict[str, Any] = {"status": status, "job_id": job_id}
    if print_file_url is not None:
        sets.append("print_file_url = %(print_file_url)s")
        params["print_file_url"] = print_file_url
    if work_order_url is not None:
        sets.append("work_order_url = %(work_order_url)s")
        params["work_order_url"] = work_order_url
    if error is not None:
        sets.append("error = %(error)s")
        params["error"] = error
    if started:
        sets.append("started_at = %(now)s")
        params["now"] = datetime.now(timezone.utc)
    if completed:
        sets.append("completed_at = %(now)s")
        params["now"] = datetime.now(timezone.utc)

    sql = f"update production_jobs set {', '.join(sets)} where id = %(job_id)s"
    with connect() as conn:
        conn.execute(sql, params)
        conn.commit()


def set_order_status(order_id: str, status: str) -> None:
    with connect() as conn:
        conn.execute(
            "update orders set status = %s where id = %s", (status, order_id)
        )
        conn.commit()
