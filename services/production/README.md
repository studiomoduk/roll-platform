# Palava Production Engine

Turns a paid order into a **print-ready, cut-ready file** for the digital
textile printer (SPEC §2). Pattern → length alter → seam allowance → nest →
print-layer generation → TIFF + work-order PDF.

It shares Postgres with the web app and writes status into `production_jobs`,
which the portal's confirmation screen and the admin board read.

## Pipeline

| Stage | Module | Job status |
|-------|--------|------------|
| 1. Retrieve graded pattern | `pipeline/pattern.py` | `pattern_ready` |
| 2. Apply length alteration (Stage 2) | `pipeline/alter.py` | |
| 3. Add seam allowance | `pipeline/seam.py` | |
| 4. Create the lay (nesting) | `pipeline/nest.py` | `nested` |
| 5. Generate print layers | `pipeline/print_layers.py` | |
| 6. Export TIFF | `pipeline/print_layers.py` | `print_ready` |
| 7. Work order PDF | `pipeline/work_order.py` | |

Stages 5–7 produce the artifacts; the engine stops at `print_ready`. Fixation,
cutting, sewing, packing and shipping are human steps advanced from the admin
board.

## Run it

```bash
cd services/production
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

export DATABASE_URL="postgresql://...supabase..."   # same as the web app
export PRODUCTION_ENGINE_TOKEN="dev-shared-secret"

# HTTP service (web app POSTs /produce on payment):
uvicorn app.main:app --reload --port 8000

# …or the polling worker (drains queued jobs, no HTTP needed):
python -m app.worker
```

Trigger manually:

```bash
curl -X POST localhost:8000/produce \
  -H "authorization: Bearer dev-shared-secret" \
  -H "content-type: application/json" \
  -d '{"order_id":"<uuid>"}'
```

Artifacts are written under `out/<order>/<job>/` as `print.tiff` +
`work-order.pdf` (local dev). Set `PUBLIC_BASE_URL` to return object-storage
URLs instead; swap `storage.save_bytes` for an S3/Supabase upload in production.

## Pattern format

Pieces are read from a simple SVG (`patterns/*.svg`) where each `<polygon>` is a
piece in centimetres with `data-label`, `data-cut`, `data-seam`, `data-hem` and
`data-ls-y` (lengthen/shorten line). Real DXF-AAMA/ASTM import via `ezdxf` would
replace `pipeline/pattern.py` and feed the same `Piece` objects downstream.
