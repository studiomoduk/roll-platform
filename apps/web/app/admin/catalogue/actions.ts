"use server";

import { revalidatePath } from "next/cache";
import { db } from "@palava/db";
import { eq, not } from "drizzle-orm";
import { collections, styles, fabrics } from "@palava/db";

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}
function numOrNull(form: FormData, key: string): string | null {
  const v = str(form, key);
  return v === "" ? null : Number(v).toString();
}

export async function createCollection(form: FormData): Promise<void> {
  const name = str(form, "name");
  if (!name) return;
  await db.insert(collections).values({
    name,
    season: str(form, "season") || null,
    year: str(form, "year") ? Number(str(form, "year")) : null,
    blurb: str(form, "blurb") || null,
  });
  revalidatePath("/admin/catalogue");
}

export async function createStyle(form: FormData): Promise<void> {
  const name = str(form, "name");
  const collectionId = str(form, "collectionId");
  const kind = str(form, "kind");
  if (!name || !collectionId || !kind) return;
  await db.insert(styles).values({
    name,
    collectionId,
    kind: kind as never,
    baseLengthCm: numOrNull(form, "baseLengthCm"),
    stage2MinCm: numOrNull(form, "stage2MinCm"),
    stage2MaxCm: numOrNull(form, "stage2MaxCm"),
  });
  revalidatePath("/admin/catalogue");
  revalidatePath("/");
}

export async function createFabric(form: FormData): Promise<void> {
  const name = str(form, "name");
  const baseCloth = str(form, "baseCloth");
  if (!name || !baseCloth) return;
  await db.insert(fabrics).values({
    name,
    baseCloth,
    printMode: (str(form, "printMode") || "repeat") as never,
    widthCm: str(form, "widthCm") ? Number(str(form, "widthCm")) : 150,
    pricePerMetre: numOrNull(form, "pricePerMetre"),
    stockMetres: numOrNull(form, "stockMetres") ?? "0",
  });
  revalidatePath("/admin/catalogue");
  revalidatePath("/");
}

export async function updateFabric(form: FormData): Promise<void> {
  const id = str(form, "id");
  if (!id) return;
  await db
    .update(fabrics)
    .set({
      pricePerMetre: numOrNull(form, "pricePerMetre"),
      stockMetres: numOrNull(form, "stockMetres") ?? "0",
    })
    .where(eq(fabrics.id, id));
  revalidatePath("/admin/catalogue");
}

export async function toggleFabricActive(form: FormData): Promise<void> {
  const id = str(form, "id");
  if (!id) return;
  await db
    .update(fabrics)
    .set({ isActive: not(fabrics.isActive) })
    .where(eq(fabrics.id, id));
  revalidatePath("/admin/catalogue");
  revalidatePath("/");
}

export async function toggleStyleActive(form: FormData): Promise<void> {
  const id = str(form, "id");
  if (!id) return;
  await db
    .update(styles)
    .set({ isActive: not(styles.isActive) })
    .where(eq(styles.id, id));
  revalidatePath("/admin/catalogue");
  revalidatePath("/");
}

export async function toggleCollectionActive(form: FormData): Promise<void> {
  const id = str(form, "id");
  if (!id) return;
  await db
    .update(collections)
    .set({ isActive: not(collections.isActive) })
    .where(eq(collections.id, id));
  revalidatePath("/admin/catalogue");
  revalidatePath("/");
}
