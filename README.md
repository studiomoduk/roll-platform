# Palava — Made to Order

A made-to-order clothing platform. A customer chooses an archive **style** + a
**print**, and the system produces a print-ready, cut-ready file for the
micro-factory — no stock held. See [`SPEC.md`](./SPEC.md) for the full brief.

## Layers

| Layer | Where | Status |
|-------|-------|--------|
| **A. Customer portal** — style → print → fit → order | `apps/web` | built (Phase 1) |
| **B. Production engine** — order → print-ready engineered marker | `services/production` | built (Phase 2) |
| **C. Order & inventory ops** — status board, stock, sizing handoff | `apps/web/admin` + `packages/db` | started (Phase 3) |

## Repo layout

```
apps/web/            Next.js (App Router) + TypeScript + Tailwind — portal + admin
services/production/  Python (FastAPI) — pattern → seam allowance → lay → print file
packages/db/          Drizzle schema + migrations + seed (Postgres / Supabase)
patterns/             sample SVG pattern files
SPEC.md               project brief & technical spec
```

## Stack

- **Web:** Next.js 15, TypeScript, Tailwind, Stripe Checkout
- **DB:** Postgres via **Supabase**, accessed with Drizzle ORM
- **Engine:** Python / FastAPI, `shapely` + `Pillow` + `reportlab`
- **Storage:** local `out/` in dev; S3/Supabase Storage in production

## Quick start

```bash
# 0. prerequisites: Node 20+, pnpm 10, Python 3.11+

# 1. install JS deps
pnpm install

# 2. configure env
cp .env.example .env
#   set DATABASE_URL to your Supabase Postgres connection string.
#   Stripe + Supabase keys are optional in dev (see notes below).

# 3. create schema + seed the catalogue
pnpm db:generate     # generate SQL migrations from the Drizzle schema
pnpm db:migrate      # apply them
pnpm db:seed         # collections, styles, fabrics, trims, a returning customer

# 4. run the portal
pnpm dev             # http://localhost:3000

# 5. run the production engine (separate terminal)
cd services/production
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
DATABASE_URL=... uvicorn app.main:app --reload --port 8000
```

### Dev conveniences

- **No Stripe key?** Checkout marks the order `paid` immediately and jumps to the
  confirmation screen, so you can exercise the whole pipeline without Stripe.
- **No engine running?** Orders still complete; their production jobs stay
  `queued` until the engine (or `python -m app.worker`) picks them up.

## The flow

1. Customer picks a style → print/fabric → size → (optional) hem adjustment → pays.
2. `POST /api/checkout` creates a `draft` order + Stripe Checkout session.
3. On `checkout.session.completed`, the order flips to `paid`, a `production_job`
   is created per item, fabric stock is deducted, and the engine is triggered.
4. The engine runs the pipeline and writes `print_file_url` + `work_order_url`
   back onto the job; status moves `queued → pattern_ready → nested → print_ready`.
5. The confirmation screen and admin board show the micro-factory pipeline live.

## Phases (SPEC §6)

1. ✅ **Portal + DB** — catalogue, customers/purchase history, Stripe checkout → `paid` order.
2. ✅ **Production engine** — pattern → length alter → seam allowance → nest → print file + work order.
3. 🚧 **Ops** — production status board ✅, stock deduction ✅, sizing-help handoff ✅, catalogue admin (read ✅, edit forms TODO).
4. ⏳ **Later** — body scanning + full custom alterations.
