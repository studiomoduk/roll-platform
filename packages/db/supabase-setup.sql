-- ============================================================================
-- Palava — one-shot Supabase setup (schema + seed data)
--
-- For iPhone / no-terminal setup: paste this whole file into the Supabase
-- SQL Editor (Supabase dashboard → SQL Editor → New query → paste → Run).
-- It is safe to re-run: schema uses IF NOT EXISTS, and the seed wipes &
-- re-inserts the catalogue tables. Do NOT re-run once you have real orders.
--
-- This replaces `pnpm db:migrate && pnpm db:seed` when you can't use a terminal.
-- ============================================================================

-- ---------- ENUM types -------------------------------------------------------
DO $$ BEGIN CREATE TYPE "public"."inventory_item_type" AS ENUM('fabric', 'trim'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."order_status" AS ENUM('draft', 'paid', 'in_production', 'cut', 'sewing', 'shipped', 'cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."pattern_format" AS ENUM('dxf', 'svg'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."production_status" AS ENUM('queued', 'pattern_ready', 'nested', 'print_ready', 'printed', 'fixed', 'cut', 'sewn', 'packed', 'shipped', 'failed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."purchase_source" AS ENUM('palava', 'stockist', 'unknown'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."style_kind" AS ENUM('dress', 'pinafore', 'blouse', 'skirt', 'top', 'trousers'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."print_mode" AS ENUM('repeat', 'engineered'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ---------- Tables -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"season" text,
	"year" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"blurb" text
);
CREATE TABLE IF NOT EXISTS "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_email_unique" UNIQUE("email")
);
CREATE TABLE IF NOT EXISTS "fabrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"print_artwork_url" text,
	"base_cloth" text NOT NULL,
	"width_cm" integer DEFAULT 150 NOT NULL,
	"price_per_metre" numeric(10, 2),
	"stock_metres" numeric(10, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"print_mode" "print_mode" DEFAULT 'repeat' NOT NULL
);
CREATE TABLE IF NOT EXISTS "inventory_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_type" "inventory_item_type" NOT NULL,
	"item_id" uuid NOT NULL,
	"qty_delta" numeric(10, 2) NOT NULL,
	"reason" text,
	"order_id" uuid,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"style_id" uuid NOT NULL,
	"fabric_id" uuid NOT NULL,
	"size" text NOT NULL,
	"stage" integer DEFAULT 1 NOT NULL,
	"length_adj_cm" numeric(6, 2) DEFAULT '0' NOT NULL,
	"fabric_metres_est" numeric(10, 2),
	"price" numeric(10, 2) DEFAULT '0' NOT NULL
);
CREATE TABLE IF NOT EXISTS "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"status" "order_status" DEFAULT 'draft' NOT NULL,
	"total" numeric(10, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'gbp' NOT NULL,
	"stripe_session_id" text,
	"stripe_payment_intent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "pattern_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"style_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"format" "pattern_format" NOT NULL,
	"storage_url" text NOT NULL,
	"pieces_meta" jsonb
);
CREATE TABLE IF NOT EXISTS "production_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_item_id" uuid NOT NULL,
	"status" "production_status" DEFAULT 'queued' NOT NULL,
	"print_file_url" text,
	"work_order_url" text,
	"error" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "purchase_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"purchased_at" timestamp with time zone NOT NULL,
	"style_id" uuid,
	"size" text,
	"source" "purchase_source" DEFAULT 'unknown' NOT NULL
);
CREATE TABLE IF NOT EXISTS "styles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" "style_kind" NOT NULL,
	"base_length_cm" numeric(6, 2),
	"stage2_min_cm" numeric(6, 2),
	"stage2_max_cm" numeric(6, 2),
	"pattern_ref" text,
	"is_active" boolean DEFAULT true NOT NULL
);
CREATE TABLE IF NOT EXISTS "trims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"stock_qty" integer DEFAULT 0 NOT NULL
);

-- ---------- Foreign keys -----------------------------------------------------
DO $$ BEGIN ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id"); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "order_items" ADD CONSTRAINT "order_items_style_id_styles_id_fk" FOREIGN KEY ("style_id") REFERENCES "public"."styles"("id"); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "order_items" ADD CONSTRAINT "order_items_fabric_id_fabrics_id_fk" FOREIGN KEY ("fabric_id") REFERENCES "public"."fabrics"("id"); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id"); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "pattern_files" ADD CONSTRAINT "pattern_files_style_id_styles_id_fk" FOREIGN KEY ("style_id") REFERENCES "public"."styles"("id") ON DELETE cascade; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "production_jobs" ADD CONSTRAINT "production_jobs_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "purchase_history" ADD CONSTRAINT "purchase_history_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "purchase_history" ADD CONSTRAINT "purchase_history_style_id_styles_id_fk" FOREIGN KEY ("style_id") REFERENCES "public"."styles"("id"); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "styles" ADD CONSTRAINT "styles_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade; EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "pattern_files_style_idx" ON "pattern_files" USING btree ("style_id");
CREATE INDEX IF NOT EXISTS "purchase_history_customer_idx" ON "purchase_history" USING btree ("customer_id");

-- ============================================================================
-- Seed data (mirrors packages/db/src/seed.ts)
-- ============================================================================
DO $$
DECLARE
  ss21 uuid; aw19 uuid;
  daphne uuid; marlow uuid; quince uuid;
  rosa uuid;
BEGIN
  -- Clear seeded tables (FK-safe order)
  DELETE FROM purchase_history;
  DELETE FROM pattern_files;
  DELETE FROM styles;
  DELETE FROM collections;
  DELETE FROM fabrics;
  DELETE FROM trims;
  DELETE FROM customers;

  -- Collections
  INSERT INTO collections (name, season, year, is_active, blurb)
  VALUES ('Coastal','Spring/Summer',2021,true,'Light cotton lawns and easy shapes drawn from the SS21 archive.')
  RETURNING id INTO ss21;
  INSERT INTO collections (name, season, year, is_active, blurb)
  VALUES ('Orchard','Autumn/Winter',2019,true,'Needlecord pinafores and blouses from the AW19 archive.')
  RETURNING id INTO aw19;

  -- Styles
  INSERT INTO styles (collection_id, name, kind, base_length_cm, stage2_min_cm, stage2_max_cm, pattern_ref, is_active)
  VALUES (ss21,'Daphne Dress','dress',112.00,-10.00,10.00,'DAPHNE-V1',true) RETURNING id INTO daphne;
  INSERT INTO styles (collection_id, name, kind, base_length_cm, stage2_min_cm, stage2_max_cm, pattern_ref, is_active)
  VALUES (ss21,'Marlow Blouse','blouse',62.00,-6.00,6.00,'MARLOW-V1',true) RETURNING id INTO marlow;
  INSERT INTO styles (collection_id, name, kind, base_length_cm, stage2_min_cm, stage2_max_cm, pattern_ref, is_active)
  VALUES (aw19,'Quince Pinafore','pinafore',98.00,-10.00,10.00,'QUINCE-V1',true) RETURNING id INTO quince;

  -- Pattern files
  INSERT INTO pattern_files (style_id, version, format, storage_url, pieces_meta) VALUES
  (daphne, 1, 'svg', 'patterns/daphne-v1.svg',
   '{"unit":"cm","pieces":[{"id":"bodice-front","label":"Bodice front","cut":2,"seamAllowanceCm":1.0,"hemAllowanceCm":2.5,"lengthenShortenLine":{"from":[0,40],"to":[30,40]}},{"id":"bodice-back","label":"Bodice back","cut":2,"seamAllowanceCm":1.0,"hemAllowanceCm":2.5,"lengthenShortenLine":{"from":[0,40],"to":[30,40]}},{"id":"skirt-front","label":"Skirt front","cut":1,"seamAllowanceCm":1.5,"hemAllowanceCm":4.0,"lengthenShortenLine":{"from":[0,60],"to":[70,60]}}]}'::jsonb),
  (quince, 1, 'dxf', 'patterns/quince-v1.dxf',
   '{"unit":"cm","pieces":[{"id":"bib-front","label":"Bib front","cut":1,"seamAllowanceCm":1.0,"hemAllowanceCm":1.0},{"id":"bib-back","label":"Bib back","cut":1,"seamAllowanceCm":1.0,"hemAllowanceCm":1.0},{"id":"skirt-front","label":"Skirt front","cut":1,"seamAllowanceCm":1.5,"hemAllowanceCm":4.0,"lengthenShortenLine":{"from":[0,60],"to":[70,60]}}]}'::jsonb);

  -- Fabrics
  INSERT INTO fabrics (name, print_artwork_url, base_cloth, print_mode, width_cm, price_per_metre, stock_metres, is_active) VALUES
  ('Wildflower — Cotton Lawn','fabrics/wildflower.png','cotton lawn','repeat',150,18.00,120.00,true),
  ('Pennant Stripe — Cotton Lawn','fabrics/pennant-stripe.png','cotton lawn','repeat',150,18.00,80.00,true),
  ('Bramble — Needlecord','fabrics/bramble.png','corduroy','engineered',150,24.00,45.00,true);

  -- Trims
  INSERT INTO trims (name, stock_qty) VALUES
  ('button-18mm',2000),('main-label',1500),('swing-tag',3000);

  -- Returning customer + purchase history
  INSERT INTO customers (email, name) VALUES ('rosa@example.com','Rosa Bell') RETURNING id INTO rosa;
  INSERT INTO purchase_history (customer_id, purchased_at, style_id, size, source)
  VALUES (rosa, '2023-05-01', daphne, 'UK 12', 'palava');
END $$;
