import "dotenv/config";
import { db, sql } from "./client";
import {
  collections,
  styles,
  fabrics,
  trims,
  patternFiles,
  customers,
  purchaseHistory,
} from "./schema";

/**
 * Seeds the database with a small but realistic Palava made-to-order catalogue:
 * two past collections, a handful of archive styles, fabrics (print + base
 * cloth), trims, sample pattern files, and one returning customer with
 * purchase history (so the portal's "what size did you last buy" step works).
 *
 * Idempotent-ish: it wipes the seeded tables first so it can be re-run.
 */
async function main() {
  console.log("Clearing existing catalogue data…");
  // Order matters for FKs.
  await db.delete(purchaseHistory);
  await db.delete(patternFiles);
  await db.delete(styles);
  await db.delete(collections);
  await db.delete(fabrics);
  await db.delete(trims);
  await db.delete(customers);

  console.log("Seeding collections…");
  const [ss21, aw19] = await db
    .insert(collections)
    .values([
      {
        name: "Coastal",
        season: "Spring/Summer",
        year: 2021,
        isActive: true,
        blurb:
          "Light cotton lawns and easy shapes drawn from the SS21 archive.",
      },
      {
        name: "Orchard",
        season: "Autumn/Winter",
        year: 2019,
        isActive: true,
        blurb: "Needlecord pinafores and blouses from the AW19 archive.",
      },
    ])
    .returning();

  console.log("Seeding styles…");
  const insertedStyles = await db
    .insert(styles)
    .values([
      {
        collectionId: ss21.id,
        name: "Daphne Dress",
        kind: "dress",
        baseLengthCm: "112.00",
        stage2MinCm: "-10.00",
        stage2MaxCm: "10.00",
        patternRef: "DAPHNE-V1",
        isActive: true,
      },
      {
        collectionId: ss21.id,
        name: "Marlow Blouse",
        kind: "blouse",
        baseLengthCm: "62.00",
        stage2MinCm: "-6.00",
        stage2MaxCm: "6.00",
        patternRef: "MARLOW-V1",
        isActive: true,
      },
      {
        collectionId: aw19.id,
        name: "Quince Pinafore",
        kind: "pinafore",
        baseLengthCm: "98.00",
        stage2MinCm: "-10.00",
        stage2MaxCm: "10.00",
        patternRef: "QUINCE-V1",
        isActive: true,
      },
    ])
    .returning();

  const daphne = insertedStyles[0];
  const quince = insertedStyles[2];

  console.log("Seeding pattern files…");
  await db.insert(patternFiles).values([
    {
      styleId: daphne.id,
      version: 1,
      format: "svg",
      storageUrl: "patterns/daphne-v1.svg",
      piecesMeta: {
        unit: "cm",
        pieces: [
          {
            id: "bodice-front",
            label: "Bodice front",
            cut: 2,
            seamAllowanceCm: 1.0,
            hemAllowanceCm: 2.5,
            lengthenShortenLine: { from: [0, 40], to: [30, 40] },
          },
          {
            id: "bodice-back",
            label: "Bodice back",
            cut: 2,
            seamAllowanceCm: 1.0,
            hemAllowanceCm: 2.5,
            lengthenShortenLine: { from: [0, 40], to: [30, 40] },
          },
          {
            id: "skirt-front",
            label: "Skirt front",
            cut: 1,
            seamAllowanceCm: 1.5,
            hemAllowanceCm: 4.0,
            lengthenShortenLine: { from: [0, 60], to: [70, 60] },
          },
        ],
      },
    },
    {
      // DXF-AAMA/ASTM pattern — exercises the engine's ezdxf import path.
      styleId: quince.id,
      version: 1,
      format: "dxf",
      storageUrl: "patterns/quince-v1.dxf",
      piecesMeta: {
        unit: "cm",
        pieces: [
          { id: "bib-front", label: "Bib front", cut: 1, seamAllowanceCm: 1.0, hemAllowanceCm: 1.0 },
          { id: "bib-back", label: "Bib back", cut: 1, seamAllowanceCm: 1.0, hemAllowanceCm: 1.0 },
          {
            id: "skirt-front",
            label: "Skirt front",
            cut: 1,
            seamAllowanceCm: 1.5,
            hemAllowanceCm: 4.0,
            lengthenShortenLine: { from: [0, 60], to: [70, 60] },
          },
        ],
      },
    },
  ]);

  console.log("Seeding fabrics…");
  await db.insert(fabrics).values([
    {
      name: "Wildflower — Cotton Lawn",
      printArtworkUrl: "fabrics/wildflower.png",
      baseCloth: "cotton lawn",
      widthCm: 150,
      pricePerMetre: "18.00",
      stockMetres: "120.00",
      isActive: true,
    },
    {
      name: "Pennant Stripe — Cotton Lawn",
      printArtworkUrl: "fabrics/pennant-stripe.png",
      baseCloth: "cotton lawn",
      widthCm: 150,
      pricePerMetre: "18.00",
      stockMetres: "80.00",
      isActive: true,
    },
    {
      name: "Bramble — Needlecord",
      printArtworkUrl: "fabrics/bramble.png",
      baseCloth: "corduroy",
      printMode: "engineered", // single placement positioned per piece
      widthCm: 150,
      pricePerMetre: "24.00",
      stockMetres: "45.00",
      isActive: true,
    },
  ]);

  console.log("Seeding trims…");
  await db.insert(trims).values([
    { name: "button-18mm", stockQty: 2000 },
    { name: "main-label", stockQty: 1500 },
    { name: "swing-tag", stockQty: 3000 },
  ]);

  console.log("Seeding a returning customer + purchase history…");
  const [returning] = await db
    .insert(customers)
    .values({ email: "rosa@example.com", name: "Rosa Bell" })
    .returning();

  await db.insert(purchaseHistory).values({
    customerId: returning.id,
    purchasedAt: new Date("2023-05-01"),
    styleId: daphne.id,
    size: "UK 12",
    source: "palava",
  });

  console.log("Seed complete ✔");
  await sql.end();
}

main().catch(async (err) => {
  console.error(err);
  await sql.end();
  process.exit(1);
});
