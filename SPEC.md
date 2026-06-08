# Palava — Made to Order System

**Project brief & technical spec.** Drop this file into the repo root as `SPEC.md` (or rename to `CLAUDE.md`) and point Claude Code at it.

This describes a made-to-order clothing platform for Palava, based on the “Kit Form Clothing” and “Palava Micro Factory” plans. A customer chooses an archive style + print, and the system produces a print-ready, cut-ready file for the micro-factory — no stock held.

-----

## 1. The three layers

|Layer                       |What it does                                                                               |Build priority|
|----------------------------|-------------------------------------------------------------------------------------------|--------------|
|**A. Customer portal**      |The ordering journey (style → print → fit → order). Prototype already exists.              |Phase 1       |
|**B. Production engine**    |Turns an order into a print-ready, cut-ready file for the digital printer. The clever core.|Phase 2       |
|**C. Order & inventory ops**|Order status through the factory, fabric/trim stock, bridge to the wholesale model.        |Phase 3       |

-----

## 2. Production engine (Layer B)

This automates everything in the second half of the Kit Form sketch, from “DXF file” down to “order cut to length.” The output is a **print-ready engineered marker** that a digital textile printer can print, with cut lines and sewing instructions printed *directly onto the cloth*. Humans still do fixation, cutting, sewing, packing.

### Inputs (from the order)

- `style` + `size` → selects a specific graded pattern
- `fabric` → which base cloth + which print artwork
- `lengthAdj` → hem alteration in cm (Stage 2 only)

### Pipeline stages

**1. Retrieve graded pattern.**
Each style holds a size-graded pattern as **DXF-AAMA/ASTM** (the apparel-CAD interchange format) or SVG. Pieces are closed polylines plus grain lines, notches, internal markings. Pattern source options: Seamly2D (open source, parametric), or pre-graded exports from Gerber/Lectra/Optitex.

**2. Apply length alteration (Stage 2).**
Move the hemline along the piece’s *lengthen/shorten line* by `lengthAdj`. For a simple hem change this is a translation of the lower segment; store the lengthen/shorten line as metadata per piece so it’s unambiguous. Cap the range (e.g. ±10 cm) so it stays a “simple change,” per the plan.

**3. Add seam allowance.**
Offset each piece polygon outward (polygon buffer): standard 1.0–1.5 cm on seams, more at hems. Use **Clipper2** or **Shapely’s `.buffer()`** (GEOS). Keep the *sew line* and the *cut line* as two layers — the cut line is the offset outer edge; the sew line is the original.

**4. Create the lay (nesting / marker making).**
Nest all pieces for the order inside the fixed cloth width (**150 cm**) to minimise length used. This is 2D irregular bin-packing. For a single made-to-order garment it’s small and fast; the algorithm is *no-fit-polygon + optimisation*. Libraries: `jagua-rs` (Rust, permissive) or the SVGnest/Deepnest algorithm (note: Deepnest is GPL — check licensing before bundling).

**5. Generate print layers.** *(This is the part the sketch nails.)*
For each nested piece, build a print-ready raster with three composited layers:

- **Print layer** — the decorative artwork, either an all-over repeat tiled across the cloth, or an *engineered placement* positioned per piece. Clip the artwork to each piece’s cut polygon.
- **White knock-out layer** — sits over the print so the instruction marks read cleanly (the print is masked where guides/text go).
- **Instruction layer** — cut lines, notches, grain direction, piece ID (“Bodice front · cut 2”), size, and order number, printed inside the seam allowance so the marks disappear into the seam after sewing.

The result: the printer lays down the print *and* the cut guides *and* the labels in one pass. No separate marker paper; the cutter just follows printed lines.

**6. Export for the printer.**
Render to **TIFF or PDF at the printer’s RIP resolution** (≈150 dpi for textile), canvas width = cloth width, length = nested lay length. Composite via Pillow/`cairo`/`vips`. Hand to the digital textile printer’s RIP software.

**7. Work order.**
Alongside the print file, emit a PDF work order: order ref, style, size, fabric, fabric length needed (drives stock deduction), trims list (labels, buttons, swing tags), and the cut/sew steps.

### Suggested implementation

A small **Python service** (`shapely` + `pyezdxf` for DXF + a nesting lib + `Pillow`/`pyvips`) exposed over HTTP, triggered when an order is paid. It writes the print TIFF + work-order PDF to object storage and flips the order’s production status. Keep it separate from the web app so it can run on a heavier worker.

-----

## 3. Data schema (Layer C)

Postgres. Core tables and key fields:

```
customers
  id, email, name, created_at

purchase_history          -- powers the "when did you last buy / what size" step
  id, customer_id, purchased_at, style_id, size, source ('palava'|'stockist'|'unknown')

collections               -- past seasons offered for made-to-order
  id, name, season, year, is_active, blurb

styles
  id, collection_id, name, kind ('dress'|'pinafore'|'blouse'...),
  base_length_cm, stage2_min_cm, stage2_max_cm, pattern_ref, is_active

pattern_files             -- one graded file per style (DXF/SVG), versioned
  id, style_id, version, format, storage_url,
  pieces_meta (jsonb: per-piece seam allowances, lengthen/shorten line, "cut N")

fabrics                   -- print + base cloth, what the customer picks
  id, name, print_artwork_url, base_cloth ('cotton lawn'|'corduroy'...),
  width_cm (default 150), price_per_metre, stock_metres, is_active

trims
  id, name ('button-18mm'|'main-label'|'swing-tag'), stock_qty

orders
  id, customer_id, status, total, currency, created_at, paid_at
  -- status: draft → paid → in_production → cut → sewing → shipped

order_items
  id, order_id, style_id, fabric_id, size, stage (1|2), length_adj_cm,
  fabric_metres_est, price

production_jobs           -- one per order_item, tracks the pipeline
  id, order_item_id, status, print_file_url, work_order_url,
  -- status: queued → pattern_ready → nested → print_ready → printed →
  --         fixed → cut → sewn → packed → shipped
  started_at, completed_at

inventory_movements       -- audit trail for fabric & trims
  id, item_type ('fabric'|'trim'), item_id, qty_delta, reason, order_id, at
```

Notes:

- `purchase_history` is what lets the portal greet a returning customer and pre-fill size; “not sure / never” routes to the human sizing help.
- `production_jobs.status` maps 1:1 to the micro-factory pipeline shown on the prototype’s confirmation screen.
- `fabrics.stock_metres` and `trims.stock_qty` link made-to-order to the existing wholesale model — both draw from the same cloth.

-----

## 4. Recommended stack

- **Web app:** Next.js (App Router) + TypeScript + Tailwind. Reuse the prototype component as the portal’s starting point.
- **DB:** Postgres (Supabase is a fast start — auth + storage + DB in one).
- **Payments:** Stripe.
- **Production engine:** separate Python worker (FastAPI), queued (e.g. via a jobs table or Redis/RQ).
- **File storage:** S3-compatible (Supabase Storage or R2) for pattern files, print TIFFs, work orders.

-----

## 5. Suggested repo structure

```
palava-mto/
  apps/
    web/            # Next.js portal + admin
  services/
    production/     # Python: pattern → seam allowance → lay → print file
  packages/
    db/             # schema + migrations (Drizzle or Prisma)
  patterns/         # sample DXF/SVG pattern files
  SPEC.md           # this file
```

-----

## 6. Build phases

1. **Portal + DB** — wire the existing prototype to real `collections`, `styles`, `fabrics`; add customer + purchase history; Stripe checkout. Orders land as `paid`.
1. **Production engine** — pattern retrieval → length alter → seam allowance → nest → print-layer generation → TIFF + work-order export. Start with one style, one fabric, no nesting (single piece) and grow.
1. **Ops** — production status board, stock deduction, sizing-help handoff, admin to add collections/styles/fabrics.
1. **Later** — body scanning + full custom alterations (explicitly flagged as a future step in the plan).

-----

## 7. Claude Code kickoff prompt

Open a terminal in an empty folder, run `claude`, and paste:

> Read SPEC.md. Scaffold the Palava made-to-order monorepo as described: a Next.js + TypeScript + Tailwind web app and a Postgres schema (use Drizzle). Implement Phase 1 only — the customer portal wired to seeded `collections`, `styles`, and `fabrics`, plus `customers`/`purchase_history`, and a Stripe checkout that creates a `paid` order. Use the provided prototype component as the portal’s starting UI. Stub the production engine for now. Ask me before choosing between Supabase and self-hosted Postgres.

(Then add the prototype `.jsx` to the repo so Claude Code can build from it.)

-----

## 8. Decisions Palava needs to make

- **Pattern source** — what CAD format do the existing patterns come in (Gerber, Lectra, hand-drafted)? This sets the import path.
- **Print model** — all-over repeat, or engineered placement per piece? Changes step 5 significantly.
- **Printer** — which digital textile printer / RIP, and its required input format and resolution.
- **Where the human steps sit** — confirm the engine stops at “print-ready file”; fixation/cut/sew stay manual for now.
- **Stockist purchase history** — can past sales (incl. via stockists) be imported to power the sizing step, or is it Palava-direct only at launch?