# Deploying Palava (Vercel + Supabase)

This gets the **customer portal + admin** live on a public URL. The Python
production engine runs separately (optional for testing — without it, paid
orders simply sit at `queued`). Steps 1–4 are enough for a shareable test link.

---

## 1. Create the Supabase database

1. Create a project at <https://supabase.com> (free tier is fine).
2. Project Settings → **Database** → Connection string. Copy **two** URLs:
   - **Pooled / Transaction** (host `...pooler...`, port **6543**) — for the app
     at runtime (serverless-friendly; works with our `prepare: false` client).
   - **Direct** (port **5432**) — for running migrations.
   Add the password you set, and append `?sslmode=require` to each.

## 2. Migrate + seed (from your machine)

```bash
git fetch origin claude/new-session-tvk578 && git checkout claude/new-session-tvk578
pnpm install

# Use the DIRECT (5432) URL for schema work:
export DATABASE_URL="postgresql://postgres:[pwd]@db.[ref].supabase.co:5432/postgres?sslmode=require"
pnpm db:migrate
pnpm db:seed      # collections, styles, fabrics, sample patterns, a returning customer
```

> No local terminal? You can also run the SQL in `packages/db/migrations/*.sql`
> via the Supabase SQL editor, then run `pnpm db:seed` from anywhere with the URL.

## 3. Import the repo into Vercel

1. <https://vercel.com> → **Add New… → Project** → import `studiomoduk/roll-platform`.
2. **Root Directory:** set to `apps/web` (click *Edit* → choose `apps/web`).
   Vercel detects Next.js and the pnpm workspace automatically and installs from
   the repo root — leave Build/Install commands on their defaults.
3. **Environment Variables** (Production + Preview):

   | Name | Value | Required |
   |------|-------|----------|
   | `DATABASE_URL` | the **pooled (6543)** Supabase URL | ✅ |
   | `NEXT_PUBLIC_APP_URL` | your Vercel URL, e.g. `https://palava.vercel.app` | recommended |
   | `STRIPE_SECRET_KEY` | `sk_...` | optional* |
   | `STRIPE_WEBHOOK_SECRET` | `whsec_...` | optional* |
   | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_...` | optional* |
   | `PRODUCTION_ENGINE_URL` | engine URL (step 5) | optional |
   | `PRODUCTION_ENGINE_TOKEN` | shared secret | optional |

   \* **Without Stripe keys, checkout marks the order paid immediately** and goes
   straight to the confirmation screen — perfect for a test link. With them, set
   `NEXT_PUBLIC_APP_URL` so Stripe redirects resolve. (If you skip
   `NEXT_PUBLIC_APP_URL`, the app falls back to Vercel's `VERCEL_URL` at runtime.)

## 4. Deploy → test

Click **Deploy**. When it's live, open the URL and walk the flow:

- Home → pick a style → choose print/size/**Adjust the hem** → **Order**
- Confirmation screen shows the micro-factory pipeline (jobs are `queued` until
  the engine runs)
- `/admin` — production board · `/admin/catalogue` — add/edit collections,
  styles, fabrics

That's your shareable link. ✅

---

## 5. (Optional) Deploy the production engine

The engine is a Python/FastAPI service — host it on **Render**, **Railway**, or
**Fly.io** (not Vercel). Point it at the **same** Supabase DB.

- Root dir: `services/production`
- Build: `pip install -r requirements.txt`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Env: `DATABASE_URL` (pooled), `PRODUCTION_ENGINE_TOKEN`, and either
  `PUBLIC_BASE_URL` (to return object-storage URLs) or leave default to write
  artifacts locally on the worker.

Then set `PRODUCTION_ENGINE_URL` + `PRODUCTION_ENGINE_TOKEN` in Vercel so paid
orders trigger production and advance past `queued`. (Or run
`python -m app.worker` on the engine host to poll the DB instead of HTTP.)

For print files (TIFF/PDF) to be downloadable from the portal, give the engine a
Supabase Storage bucket and swap `storage.save_bytes` for an upload — see
`services/production/README.md`.

---

## Notes

- **Pooled vs direct URL:** use pooled (6543) for the app, direct (5432) for
  migrations. Mixing them up is the most common deploy snag.
- **Re-seeding:** `pnpm db:seed` clears and re-inserts catalogue data; don't run
  it against a DB with real orders.
- This is a feature-branch deploy. Connect Vercel to `main` once this PR merges
  for production, and to the branch for preview deployments.
