CREATE TYPE "public"."inventory_item_type" AS ENUM('fabric', 'trim');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('draft', 'paid', 'in_production', 'cut', 'sewing', 'shipped', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."pattern_format" AS ENUM('dxf', 'svg');--> statement-breakpoint
CREATE TYPE "public"."production_status" AS ENUM('queued', 'pattern_ready', 'nested', 'print_ready', 'printed', 'fixed', 'cut', 'sewn', 'packed', 'shipped', 'failed');--> statement-breakpoint
CREATE TYPE "public"."purchase_source" AS ENUM('palava', 'stockist', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."style_kind" AS ENUM('dress', 'pinafore', 'blouse', 'skirt', 'top', 'trousers');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"season" text,
	"year" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"blurb" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fabrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"print_artwork_url" text,
	"base_cloth" text NOT NULL,
	"width_cm" integer DEFAULT 150 NOT NULL,
	"price_per_metre" numeric(10, 2),
	"stock_metres" numeric(10, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_type" "inventory_item_type" NOT NULL,
	"item_id" uuid NOT NULL,
	"qty_delta" numeric(10, 2) NOT NULL,
	"reason" text,
	"order_id" uuid,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pattern_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"style_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"format" "pattern_format" NOT NULL,
	"storage_url" text NOT NULL,
	"pieces_meta" jsonb
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"purchased_at" timestamp with time zone NOT NULL,
	"style_id" uuid,
	"size" text,
	"source" "purchase_source" DEFAULT 'unknown' NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"stock_qty" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_items" ADD CONSTRAINT "order_items_style_id_styles_id_fk" FOREIGN KEY ("style_id") REFERENCES "public"."styles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_items" ADD CONSTRAINT "order_items_fabric_id_fabrics_id_fk" FOREIGN KEY ("fabric_id") REFERENCES "public"."fabrics"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pattern_files" ADD CONSTRAINT "pattern_files_style_id_styles_id_fk" FOREIGN KEY ("style_id") REFERENCES "public"."styles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "production_jobs" ADD CONSTRAINT "production_jobs_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_history" ADD CONSTRAINT "purchase_history_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_history" ADD CONSTRAINT "purchase_history_style_id_styles_id_fk" FOREIGN KEY ("style_id") REFERENCES "public"."styles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "styles" ADD CONSTRAINT "styles_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pattern_files_style_idx" ON "pattern_files" USING btree ("style_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_history_customer_idx" ON "purchase_history" USING btree ("customer_id");