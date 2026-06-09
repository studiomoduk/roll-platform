import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@palava/db";
import { eq } from "drizzle-orm";
import { orders } from "@palava/db";
import { stripe } from "@/lib/stripe";
import { markOrderPaid } from "@/lib/fulfillment";

// Stripe needs the raw body to verify the signature.
export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET not set" },
      { status: 503 },
    );
  }

  const sig = req.headers.get("stripe-signature");
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig ?? "", secret);
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (orderId) {
      await db
        .update(orders)
        .set({ stripePaymentIntent: String(session.payment_intent ?? "") })
        .where(eq(orders.id, orderId));
      await markOrderPaid(orderId);
    }
  }

  return NextResponse.json({ received: true });
}
