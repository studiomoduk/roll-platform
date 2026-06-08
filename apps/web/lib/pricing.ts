import type { Style, Fabric } from "@palava/db";

/**
 * Rough fabric-usage estimate (metres) for a made-to-order garment, before the
 * production engine computes the exact nested lay length. Based on the style's
 * base length plus any Stage-2 hem adjustment, with an allowance factor for
 * pieces that don't run full-width.
 */
export function estimateFabricMetres(
  style: Pick<Style, "baseLengthCm" | "kind">,
  lengthAdjCm = 0,
): number {
  const base = Number(style.baseLengthCm ?? 100);
  const lengthCm = base + lengthAdjCm;
  // Allowance factor: garments need more than their finished length once all
  // pieces are nested. Dresses/pinafores nest less efficiently than tops.
  const factor =
    style.kind === "dress" || style.kind === "pinafore" ? 1.9 : 1.4;
  const metres = (lengthCm * factor) / 100;
  // Round up to the nearest 0.1 m.
  return Math.ceil(metres * 10) / 10;
}

/** Price in major currency units (e.g. pounds). */
export function estimatePrice(
  style: Pick<Style, "baseLengthCm" | "kind">,
  fabric: Pick<Fabric, "pricePerMetre">,
  lengthAdjCm = 0,
): { fabricMetres: number; fabricCost: number; makeCost: number; total: number } {
  const fabricMetres = estimateFabricMetres(style, lengthAdjCm);
  const perMetre = Number(fabric.pricePerMetre ?? 0);
  const fabricCost = fabricMetres * perMetre;
  // Flat make/print cost per garment for the made-to-order service.
  const makeCost = 65;
  const total = Math.round((fabricCost + makeCost) * 100) / 100;
  return { fabricMetres, fabricCost, makeCost, total };
}
