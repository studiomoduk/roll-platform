import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* -------------------------------------------------------------------------- */
/*  Enums                                                                      */
/* -------------------------------------------------------------------------- */

export const purchaseSourceEnum = pgEnum("purchase_source", [
  "palava",
  "stockist",
  "unknown",
]);

export const styleKindEnum = pgEnum("style_kind", [
  "dress",
  "pinafore",
  "blouse",
  "skirt",
  "top",
  "trousers",
]);

export const patternFormatEnum = pgEnum("pattern_format", ["dxf", "svg"]);

// orders: draft → paid → in_production → cut → sewing → shipped
export const orderStatusEnum = pgEnum("order_status", [
  "draft",
  "paid",
  "in_production",
  "cut",
  "sewing",
  "shipped",
  "cancelled",
]);

// production_jobs pipeline:
// queued → pattern_ready → nested → print_ready → printed →
//          fixed → cut → sewn → packed → shipped
export const productionStatusEnum = pgEnum("production_status", [
  "queued",
  "pattern_ready",
  "nested",
  "print_ready",
  "printed",
  "fixed",
  "cut",
  "sewn",
  "packed",
  "shipped",
  "failed",
]);

export const inventoryItemTypeEnum = pgEnum("inventory_item_type", [
  "fabric",
  "trim",
]);

// How the decorative artwork is laid onto the cloth (SPEC §2.5):
//   repeat     — an all-over repeat tiled across the cloth
//   engineered — a single placement positioned per piece
export const printModeEnum = pgEnum("print_mode", ["repeat", "engineered"]);

/* -------------------------------------------------------------------------- */
/*  Tables                                                                     */
/* -------------------------------------------------------------------------- */

export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** Powers the "when did you last buy / what size" step. */
export const purchaseHistory = pgTable(
  "purchase_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull(),
    styleId: uuid("style_id").references(() => styles.id),
    size: text("size"),
    source: purchaseSourceEnum("source").notNull().default("unknown"),
  },
  (t) => ({
    customerIdx: index("purchase_history_customer_idx").on(t.customerId),
  }),
);

/** Past seasons offered for made-to-order. */
export const collections = pgTable("collections", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  season: text("season"),
  year: integer("year"),
  isActive: boolean("is_active").notNull().default(true),
  blurb: text("blurb"),
});

export const styles = pgTable("styles", {
  id: uuid("id").defaultRandom().primaryKey(),
  collectionId: uuid("collection_id")
    .notNull()
    .references(() => collections.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  kind: styleKindEnum("kind").notNull(),
  baseLengthCm: numeric("base_length_cm", { precision: 6, scale: 2 }),
  stage2MinCm: numeric("stage2_min_cm", { precision: 6, scale: 2 }),
  stage2MaxCm: numeric("stage2_max_cm", { precision: 6, scale: 2 }),
  patternRef: text("pattern_ref"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
});

/** One graded file per style (DXF/SVG), versioned. */
export const patternFiles = pgTable(
  "pattern_files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    styleId: uuid("style_id")
      .notNull()
      .references(() => styles.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(1),
    format: patternFormatEnum("format").notNull(),
    storageUrl: text("storage_url").notNull(),
    /** per-piece seam allowances, lengthen/shorten line, "cut N" */
    piecesMeta: jsonb("pieces_meta").$type<PiecesMeta>(),
  },
  (t) => ({
    styleIdx: index("pattern_files_style_idx").on(t.styleId),
  }),
);

/** Print + base cloth, what the customer picks. */
export const fabrics = pgTable("fabrics", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  printArtworkUrl: text("print_artwork_url"),
  baseCloth: text("base_cloth").notNull(), // 'cotton lawn' | 'corduroy' ...
  printMode: printModeEnum("print_mode").notNull().default("repeat"),
  widthCm: integer("width_cm").notNull().default(150),
  pricePerMetre: numeric("price_per_metre", { precision: 10, scale: 2 }),
  stockMetres: numeric("stock_metres", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  isActive: boolean("is_active").notNull().default(true),
});

export const trims = pgTable("trims", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(), // 'button-18mm' | 'main-label' | 'swing-tag'
  stockQty: integer("stock_qty").notNull().default(0),
});

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id),
  status: orderStatusEnum("status").notNull().default("draft"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("gbp"),
  stripeSessionId: text("stripe_session_id"),
  stripePaymentIntent: text("stripe_payment_intent"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  styleId: uuid("style_id")
    .notNull()
    .references(() => styles.id),
  fabricId: uuid("fabric_id")
    .notNull()
    .references(() => fabrics.id),
  size: text("size").notNull(),
  stage: integer("stage").notNull().default(1), // 1 | 2
  lengthAdjCm: numeric("length_adj_cm", { precision: 6, scale: 2 })
    .notNull()
    .default("0"),
  fabricMetresEst: numeric("fabric_metres_est", { precision: 10, scale: 2 }),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
});

/** One per order_item, tracks the production pipeline. */
export const productionJobs = pgTable("production_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderItemId: uuid("order_item_id")
    .notNull()
    .references(() => orderItems.id, { onDelete: "cascade" }),
  status: productionStatusEnum("status").notNull().default("queued"),
  printFileUrl: text("print_file_url"),
  workOrderUrl: text("work_order_url"),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

/** Audit trail for fabric & trims. */
export const inventoryMovements = pgTable("inventory_movements", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemType: inventoryItemTypeEnum("item_type").notNull(),
  itemId: uuid("item_id").notNull(),
  qtyDelta: numeric("qty_delta", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason"),
  orderId: uuid("order_id").references(() => orders.id),
  at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
});

/* -------------------------------------------------------------------------- */
/*  Relations                                                                  */
/* -------------------------------------------------------------------------- */

export const customersRelations = relations(customers, ({ many }) => ({
  purchaseHistory: many(purchaseHistory),
  orders: many(orders),
}));

export const collectionsRelations = relations(collections, ({ many }) => ({
  styles: many(styles),
}));

export const stylesRelations = relations(styles, ({ one, many }) => ({
  collection: one(collections, {
    fields: [styles.collectionId],
    references: [collections.id],
  }),
  patternFiles: many(patternFiles),
}));

export const patternFilesRelations = relations(patternFiles, ({ one }) => ({
  style: one(styles, {
    fields: [patternFiles.styleId],
    references: [styles.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  style: one(styles, { fields: [orderItems.styleId], references: [styles.id] }),
  fabric: one(fabrics, {
    fields: [orderItems.fabricId],
    references: [fabrics.id],
  }),
  jobs: many(productionJobs),
}));

export const productionJobsRelations = relations(productionJobs, ({ one }) => ({
  orderItem: one(orderItems, {
    fields: [productionJobs.orderItemId],
    references: [orderItems.id],
  }),
}));

/* -------------------------------------------------------------------------- */
/*  JSON shapes                                                                */
/* -------------------------------------------------------------------------- */

export type PieceMeta = {
  /** e.g. "bodice-front" */
  id: string;
  label: string; // "Bodice front"
  cut: number; // "cut 2"
  /** seam allowance in cm, optionally per-edge */
  seamAllowanceCm: number;
  hemAllowanceCm?: number;
  /** the lengthen/shorten line, as two points in pattern space (cm) */
  lengthenShortenLine?: { from: [number, number]; to: [number, number] };
};

export type PiecesMeta = {
  unit: "cm";
  pieces: PieceMeta[];
};

/* -------------------------------------------------------------------------- */
/*  Inferred types                                                             */
/* -------------------------------------------------------------------------- */

export type Customer = typeof customers.$inferSelect;
export type Collection = typeof collections.$inferSelect;
export type Style = typeof styles.$inferSelect;
export type PatternFile = typeof patternFiles.$inferSelect;
export type Fabric = typeof fabrics.$inferSelect;
export type Trim = typeof trims.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type ProductionJob = typeof productionJobs.$inferSelect;
export type InventoryMovement = typeof inventoryMovements.$inferSelect;
