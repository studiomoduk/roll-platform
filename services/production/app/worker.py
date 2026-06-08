"""Polling worker — an alternative to the HTTP trigger.

Run this instead of (or alongside) the FastAPI server to drain queued jobs from
the DB on an interval. Useful if the web app can't reach the engine over HTTP
(e.g. different networks) — it just watches `production_jobs.status = 'queued'`.

    python -m app.worker
"""

from __future__ import annotations

import logging
import time

from .db import fetch_queued_jobs
from .pipeline.run import run_order

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("palava.worker")

POLL_SECONDS = 5


def main() -> None:
    log.info("Production worker started; polling every %ss", POLL_SECONDS)
    seen: set[str] = set()
    while True:
        try:
            for order_id in fetch_queued_jobs():
                if order_id in seen:
                    continue
                log.info("Picking up order %s", order_id)
                run_order(order_id)
                seen.add(order_id)
        except Exception:  # noqa: BLE001
            log.exception("Worker loop error")
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
