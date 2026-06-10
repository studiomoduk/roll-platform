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
 * Seeds the database with the real Palava made-to-order catalogue: the SS26
 * dress silhouettes (Louise, Cynthia, Rita…) as styles, the hand-drawn prints
 * (Green Peas, Navy Cornfield…) as fabrics, sample pattern files, and one
 * returning customer with purchase history (so the portal's "what size did you
 * last buy" step works).
 *
 * Images hot-link Palava's own Shopify CDN. For production you'd host copies in
 * your own object storage; for a demo, referencing the live CDN is fine.
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
  const [ss26, coastal] = await db
    .insert(collections)
    .values([
      {
        name: "Spring/Summer 2026",
        season: "Spring/Summer",
        year: 2026,
        isActive: true,
        blurb:
          "Hand-drawn prints on easy cotton silhouettes — made to order, to your length.",
      },
      {
        name: "Coastal Stories",
        season: "Spring/Summer",
        year: 2026,
        isActive: true,
        blurb:
          "Seaside prints and breezy linen shapes from the coastal capsule.",
      },
    ])
    .returning();

  console.log("Seeding styles…");
  const insertedStyles = await db
    .insert(styles)
    .values([
      {
        collectionId: ss26.id,
        name: "Louise",
        kind: "dress",
        baseLengthCm: "115.00",
        stage2MinCm: "-10.00",
        stage2MaxCm: "10.00",
        patternRef: "LOUISE-V1",
        imageUrl:
          "https://palava.co/cdn/shop/products/louise-peas-front-creambg2.jpg",
        isActive: true,
      },
      {
        collectionId: ss26.id,
        name: "Cynthia",
        kind: "dress",
        baseLengthCm: "116.00",
        stage2MinCm: "-10.00",
        stage2MaxCm: "10.00",
        patternRef: "CYNTHIA-V1",
        imageUrl:
          "https://palava.co/cdn/shop/files/Cynthia-NavyCornfield-Front-Cream.jpg",
        isActive: true,
      },
      {
        collectionId: ss26.id,
        name: "Rita",
        kind: "dress",
        baseLengthCm: "118.00",
        stage2MinCm: "-10.00",
        stage2MaxCm: "10.00",
        patternRef: "RITA-V1",
        imageUrl:
          "https://palava.co/cdn/shop/files/RitaStrawberries-Front-Cream.jpg",
        isActive: true,
      },
      {
        collectionId: ss26.id,
        name: "Tabatha",
        kind: "dress",
        baseLengthCm: "114.00",
        stage2MinCm: "-10.00",
        stage2MaxCm: "10.00",
        patternRef: "TABATHA-V1",
        imageUrl:
          "https://palava.co/cdn/shop/files/Tabatha-Tennis-Front-Cream.jpg",
        isActive: true,
      },
      {
        collectionId: ss26.id,
        name: "Philippa",
        kind: "dress",
        baseLengthCm: "120.00",
        stage2MinCm: "-10.00",
        stage2MaxCm: "10.00",
        patternRef: "PHILIPPA-V1",
        imageUrl:
          "https://palava.co/cdn/shop/files/Philippa-CreamCake-Front-Cream.jpg",
        isActive: true,
      },
      {
        collectionId: coastal.id,
        name: "Beatrice",
        kind: "dress",
        baseLengthCm: "110.00",
        stage2MinCm: "-8.00",
        stage2MaxCm: "8.00",
        patternRef: "BEATRICE-V1",
        imageUrl:
          "https://palava.co/cdn/shop/files/BeatriceCap-IvoryLobsters-Front-Creambg.jpg",
        isActive: true,
      },
      {
        collectionId: coastal.id,
        name: "Mabel",
        kind: "dress",
        baseLengthCm: "112.00",
        stage2MinCm: "-8.00",
        stage2MaxCm: "8.00",
        patternRef: "MABEL-V1",
        imageUrl:
          "https://palava.co/cdn/shop/files/Mabel-NavyBoxStripe-Front-creambg.jpg",
        isActive: true,
      },
      {
        collectionId: coastal.id,
        name: "Izzy",
        kind: "dress",
        baseLengthCm: "113.00",
        stage2MinCm: "-8.00",
        stage2MaxCm: "8.00",
        patternRef: "IZZY-V1",
        imageUrl:
          "https://palava.co/cdn/shop/files/Izzy-NavyLargeSails-FrontOpenNeck-creambgcopy.jpg",
        isActive: true,
      },
    ])
    .returning();

  const louise = insertedStyles[0];
  const cynthia = insertedStyles[1];

  console.log("Seeding pattern files…");
  await db.insert(patternFiles).values([
    {
      styleId: louise.id,
      version: 1,
      format: "svg",
      storageUrl: "patterns/louise-v1.svg",
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
      styleId: cynthia.id,
      version: 1,
      format: "dxf",
      storageUrl: "patterns/cynthia-v1.dxf",
      piecesMeta: {
        unit: "cm",
        pieces: [
          { id: "bodice-front", label: "Bodice front", cut: 2, seamAllowanceCm: 1.0, hemAllowanceCm: 2.5 },
          { id: "bodice-back", label: "Bodice back", cut: 2, seamAllowanceCm: 1.0, hemAllowanceCm: 2.5 },
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
    { name: "Green Peas", printArtworkUrl: "https://palava.co/cdn/shop/products/louise-peas-front-creambg2.jpg", baseCloth: "cotton lawn", printMode: "repeat", widthCm: 150, pricePerMetre: "18.00", stockMetres: "120.00", isActive: true },
    { name: "Red Strawberries", printArtworkUrl: "https://palava.co/cdn/shop/files/RitaStrawberries-Front-Cream.jpg", baseCloth: "cotton lawn", printMode: "repeat", widthCm: 150, pricePerMetre: "18.00", stockMetres: "90.00", isActive: true },
    { name: "Green Pot Plants", printArtworkUrl: "https://palava.co/cdn/shop/files/Louise-PotPlants-Cream.jpg", baseCloth: "cotton lawn", printMode: "repeat", widthCm: 150, pricePerMetre: "18.00", stockMetres: "75.00", isActive: true },
    { name: "Teal Checks", printArtworkUrl: "https://palava.co/cdn/shop/files/Louise-TealChecks-Cream.jpg", baseCloth: "cotton", printMode: "repeat", widthCm: 150, pricePerMetre: "16.00", stockMetres: "60.00", isActive: true },
    { name: "Navy Cornfield", printArtworkUrl: "https://palava.co/cdn/shop/files/Cynthia-NavyCornfield-Front-Cream.jpg", baseCloth: "cotton lawn", printMode: "repeat", widthCm: 150, pricePerMetre: "18.00", stockMetres: "80.00", isActive: true },
    { name: "Blue Festival", printArtworkUrl: "https://palava.co/cdn/shop/files/Louise-BlueFestival-Cream.jpg", baseCloth: "cotton lawn", printMode: "repeat", widthCm: 150, pricePerMetre: "18.00", stockMetres: "55.00", isActive: true },
    { name: "Blue Ditsy Daisy", printArtworkUrl: "https://palava.co/cdn/shop/files/Rita-BlueDaisyDitsy-Front-Cream.jpg", baseCloth: "cotton lawn", printMode: "repeat", widthCm: 150, pricePerMetre: "18.00", stockMetres: "70.00", isActive: true },
    { name: "Black Big Top", printArtworkUrl: "https://palava.co/cdn/shop/files/Cynthia-BlackBigTop-Front-Cream.jpg", baseCloth: "cotton lawn", printMode: "engineered", widthCm: 150, pricePerMetre: "20.00", stockMetres: "40.00", isActive: true },
    { name: "Blue Tennis", printArtworkUrl: "https://palava.co/cdn/shop/files/Tabatha-Tennis-Front-Cream.jpg", baseCloth: "cotton lawn", printMode: "repeat", widthCm: 150, pricePerMetre: "18.00", stockMetres: "50.00", isActive: true },
    { name: "Pink Thumb Print", printArtworkUrl: "https://palava.co/cdn/shop/files/Tabatha-Thumb-front-Cream.jpg", baseCloth: "cotton lawn", printMode: "repeat", widthCm: 150, pricePerMetre: "18.00", stockMetres: "48.00", isActive: true },
    { name: "Teal Foxgloves", printArtworkUrl: "https://palava.co/cdn/shop/files/Philippa-TealFoxgloves-Creambg.jpg", baseCloth: "cotton lawn", printMode: "repeat", widthCm: 150, pricePerMetre: "18.00", stockMetres: "52.00", isActive: true },
    { name: "Navy Leaping Tigers", printArtworkUrl: "https://palava.co/cdn/shop/products/Cynthianavyleapingtigerfront2-creambg.jpg", baseCloth: "cotton lawn", printMode: "engineered", widthCm: 150, pricePerMetre: "20.00", stockMetres: "36.00", isActive: true },
    { name: "Ivory Lobster", printArtworkUrl: "https://palava.co/cdn/shop/files/BeatriceCap-IvoryLobsters-Front-Creambg.jpg", baseCloth: "cotton lawn", printMode: "repeat", widthCm: 150, pricePerMetre: "18.00", stockMetres: "44.00", isActive: true },
    { name: "Navy Box Stripe", printArtworkUrl: "https://palava.co/cdn/shop/files/Mabel-NavyBoxStripe-Front-creambg.jpg", baseCloth: "linen", printMode: "repeat", widthCm: 150, pricePerMetre: "22.00", stockMetres: "38.00", isActive: true },
    { name: "Blue Sails", printArtworkUrl: "https://palava.co/cdn/shop/files/Izzy-NavyLargeSails-FrontOpenNeck-creambgcopy.jpg", baseCloth: "linen", printMode: "repeat", widthCm: 150, pricePerMetre: "22.00", stockMetres: "42.00", isActive: true },
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
    styleId: louise.id,
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
