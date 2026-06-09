import "server-only";
import { db } from "@palava/db";
import { eq, desc, and } from "drizzle-orm";
import {
  collections,
  styles,
  fabrics,
  orders,
  orderItems,
  productionJobs,
} from "@palava/db";

export async function getActiveCollections() {
  return db.query.collections.findMany({
    where: eq(collections.isActive, true),
    with: {
      styles: {
        where: eq(styles.isActive, true),
      },
    },
    orderBy: [desc(collections.year)],
  });
}

export async function getStyle(styleId: string) {
  return db.query.styles.findFirst({
    where: eq(styles.id, styleId),
    with: { collection: true, patternFiles: true },
  });
}

export async function getActiveFabrics() {
  return db.query.fabrics.findMany({
    where: eq(fabrics.isActive, true),
  });
}

/** All collections (active or not) with their styles, for the catalogue admin. */
export async function getAllCollectionsWithStyles() {
  return db.query.collections.findMany({
    with: { styles: true },
    orderBy: [desc(collections.year)],
  });
}

export async function getOrderWithDetail(orderId: string) {
  return db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      customer: true,
      items: {
        with: { style: true, fabric: true, jobs: true },
      },
    },
  });
}

/** Production status board: every order that has reached `paid` or beyond. */
export async function getProductionBoard() {
  return db.query.orders.findMany({
    where: and(),
    with: {
      customer: true,
      items: { with: { style: true, fabric: true, jobs: true } },
    },
    orderBy: [desc(orders.createdAt)],
    limit: 100,
  });
}

export type ProductionBoardOrder = Awaited<
  ReturnType<typeof getProductionBoard>
>[number];

export { orderItems, productionJobs };
