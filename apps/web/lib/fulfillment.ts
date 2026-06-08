import "server-only";
import { db } from "@palava/db";
import { eq } from "drizzle-orm";
import {
  orders,
  orderItems,
  productionJobs,
  fabrics,
  inventoryMovements,
} from "@palava/db";
import { triggerProduction } from "./engine";

/**
 * Transitions an order to `paid` and kicks off production. Idempotent: if the
 * order is already paid (e.g. webhook fires twice) it returns early.
 *
 * On payment we:
 *   1. flip order.status → paid, set paidAt
 *   2. create one production_job (status `queued`) per order_item
 *   3. deduct estimated fabric metres from stock + write an inventory_movement
 *   4. best-effort trigger the production engine
 */
export async function markOrderPaid(orderId: string): Promise<void> {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: true },
  });
  if (!order) throw new Error(`Order ${orderId} not found`);
  if (order.status !== "draft") return; // already processed

  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({ status: "paid", paidAt: new Date() })
      .where(eq(orders.id, orderId));

    for (const item of order.items) {
      await tx.insert(productionJobs).values({
        orderItemId: item.id,
        status: "queued",
      });

      // Deduct estimated fabric from stock + audit trail.
      const metres = Number(item.fabricMetresEst ?? 0);
      if (metres > 0) {
        const fabric = await tx.query.fabrics.findFirst({
          where: eq(fabrics.id, item.fabricId),
        });
        if (fabric) {
          const next = Number(fabric.stockMetres) - metres;
          await tx
            .update(fabrics)
            .set({ stockMetres: next.toFixed(2) })
            .where(eq(fabrics.id, fabric.id));
        }
        await tx.insert(inventoryMovements).values({
          itemType: "fabric",
          itemId: item.fabricId,
          qtyDelta: (-metres).toFixed(2),
          reason: `order ${orderId} item ${item.id}`,
          orderId,
        });
      }
    }
  });

  // Outside the tx — don't let engine availability roll back the payment.
  await triggerProduction(orderId);
}

export { orderItems };
