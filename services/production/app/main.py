"""FastAPI entry point for the production engine.

The web app POSTs /produce with an order id once payment is confirmed. We run
the pipeline in a background task so the HTTP call returns immediately; status
is written to production_jobs and the portal polls it. A simple bearer token
(shared secret) guards the endpoint.
"""

from __future__ import annotations

import logging

from fastapi import BackgroundTasks, FastAPI, Header, HTTPException
from pydantic import BaseModel

from .config import settings
from .pipeline.run import run_order

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Palava Production Engine", version="0.1.0")


class ProduceRequest(BaseModel):
    order_id: str


def _auth(authorization: str | None) -> None:
    expected = f"Bearer {settings.production_engine_token}"
    if not authorization or authorization != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/produce")
def produce(
    req: ProduceRequest,
    background: BackgroundTasks,
    authorization: str | None = Header(default=None),
) -> dict[str, str]:
    _auth(authorization)
    background.add_task(run_order, req.order_id)
    return {"status": "accepted", "order_id": req.order_id}
