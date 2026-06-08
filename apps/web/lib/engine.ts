/**
 * Thin client for the Python production engine (services/production). The web
 * app fires a "produce" request once an order is paid; the engine runs the
 * pattern → seam allowance → nest → print-file pipeline asynchronously and
 * writes status back to `production_jobs`.
 *
 * The call is best-effort: if the engine is down, the job stays `queued` and a
 * worker can pick it up later. We never block the Stripe webhook on it.
 */
export async function triggerProduction(orderId: string): Promise<void> {
  const base = process.env.PRODUCTION_ENGINE_URL;
  if (!base) {
    console.warn("[engine] PRODUCTION_ENGINE_URL not set — skipping trigger.");
    return;
  }
  try {
    const res = await fetch(`${base}/produce`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.PRODUCTION_ENGINE_TOKEN ?? ""}`,
      },
      body: JSON.stringify({ order_id: orderId }),
    });
    if (!res.ok) {
      console.error("[engine] produce failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[engine] produce request errored:", err);
  }
}
