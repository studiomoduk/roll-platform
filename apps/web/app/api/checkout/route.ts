import { NextResponse } from "next/server";
import { db } from "@palava/db";
import { eq } from "drizzle-orm";
import {
  customers,
  styles,
  fabrics,
  orders,
  orderItems,
} from "@palava/db";
import { estimatePrice } from "@/lib/pricing";
import { stripe } from "@/lib/stripe";
import { markOrderPaid } from "@/lib/fulfillment";
import { getAppUrl } from "@/lib/app-url";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    styleId,
    fabricId,
    size,
    stage = 1,
    lengthAdjCm = 0,
    email,
    name,
  } = body as {
    styleId?: string;
    fabricId?: string;
    size?: string;
    stage?: number;
    lengthAdjCm?: number;
    email?: string;
    name?: string;
  };

  if (!styleId || !fabricId || !size || !email) {
    return NextResponse.json(
      { error: "Missing styleId, fabricId, size, or email." },
      { status: 400 },
    );
  }

  const [style, fabric] = await Promise.all([
    db.query.styles.findFirst({ where: eq(styles.id, styleId) }),
    db.query.fabrics.findFirst({ where: eq(fabrics.id, fabricId) }),
  ]);
  if (!style || !fabric) {
    return NextResponse.json(
      { error: "Style or fabric not found." },
      { status: 404 },
    );
  }

  const adj = stage === 2 ? Number(lengthAdjCm) : 0;
  const quote = estimatePrice(style, fabric, adj);

  // Upsert customer by email.
  let customer = await db.query.customers.findFirst({
    where: eq(customers.email, email),
  });
  if (!customer) {
    [customer] = await db
      .insert(customers)
      .values({ email, name: name ?? null })
      .returning();
  }

  // Create the draft order + single item.
  const [order] = await db
    .insert(orders)
    .values({
      customerId: customer.id,
      status: "draft",
      total: quote.total.toFixed(2),
      currency: "gbp",
    })
    .returning();

  await db.insert(orderItems).values({
    orderId: order.id,
    styleId,
    fabricId,
    size,
    stage,
    lengthAdjCm: adj.toFixed(2),
    fabricMetresEst: quote.fabricMetres.toFixed(2),
    price: quote.total.toFixed(2),
  });

  const appUrl = getAppUrl();

  // No Stripe configured → dev path: mark paid immediately so the pipeline runs.
  if (!stripe) {
    await markOrderPaid(order.id);
    return NextResponse.json({ orderId: order.id });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: Math.round(quote.total * 100),
          product_data: {
            name: `${style.name} — ${fabric.name}`,
            description: `Size ${size}${adj ? `, hem ${adj > 0 ? "+" : ""}${adj}cm` : ""}`,
          },
        },
      },
    ],
    success_url: `${appUrl}/order/${order.id}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/styles/${styleId}`,
    metadata: { orderId: order.id },
  });

  await db
    .update(orders)
    .set({ stripeSessionId: session.id })
    .where(eq(orders.id, order.id));

  return NextResponse.json({ url: session.url, orderId: order.id });
}
