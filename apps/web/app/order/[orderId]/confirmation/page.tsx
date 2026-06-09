import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderWithDetail } from "@/lib/queries";
import { Pipeline } from "@/components/Pipeline";

export const dynamic = "force-dynamic";

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const order = await getOrderWithDetail(orderId);
  if (!order) notFound();

  const paid = order.status !== "draft";

  return (
    <div className="container-narrow max-w-3xl">
      <div className="rounded-2xl border border-ink/10 bg-white/50 p-8">
        <p className="text-sm text-sage">
          {paid ? "Order confirmed" : "Order pending payment"}
        </p>
        <h1 className="mt-1 font-serif text-3xl">
          Thank you{order.customer?.name ? `, ${order.customer.name}` : ""}.
        </h1>
        <p className="mt-2 text-ink/60">
          Order <span className="font-mono">{order.id.slice(0, 8)}</span> ·{" "}
          {order.currency.toUpperCase()} {Number(order.total).toFixed(2)}
        </p>

        <div className="mt-8 space-y-8">
          {order.items.map((item) => (
            <div key={item.id} className="border-t border-ink/10 pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-serif text-xl">{item.style.name}</h2>
                  <p className="text-sm text-ink/60">
                    {item.fabric.name} · Size {item.size}
                    {Number(item.lengthAdjCm) !== 0 &&
                      ` · hem ${Number(item.lengthAdjCm) > 0 ? "+" : ""}${Number(item.lengthAdjCm)}cm`}
                  </p>
                </div>
                <span className="text-sm">£{Number(item.price).toFixed(2)}</span>
              </div>

              <div className="mt-5">
                <h3 className="mb-3 text-sm font-medium">In the micro-factory</h3>
                {item.jobs[0] ? (
                  <Pipeline status={item.jobs[0].status} />
                ) : (
                  <p className="text-sm text-ink/50">
                    Production starts once payment is confirmed.
                  </p>
                )}
                {item.jobs[0]?.printFileUrl && (
                  <a
                    href={item.jobs[0].printFileUrl}
                    className="mt-3 inline-block text-sm text-clay underline"
                  >
                    Print file
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-ink/50">
        We&apos;ll email you as your garment moves through the factory.{" "}
        <Link href="/" className="underline">
          Back to the archive
        </Link>
      </p>
    </div>
  );
}
