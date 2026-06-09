import Link from "next/link";
import { getProductionBoard } from "@/lib/queries";
import { StatusBadge } from "@/components/Pipeline";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft (unpaid)",
  paid: "Paid",
  in_production: "In production",
  cut: "Cut",
  sewing: "Sewing",
  shipped: "Shipped",
  cancelled: "Cancelled",
};

export default async function AdminPage() {
  let board: Awaited<ReturnType<typeof getProductionBoard>> = [];
  let error: string | null = null;
  try {
    board = await getProductionBoard();
  } catch (err) {
    error = (err as Error).message;
  }

  const paidOrders = board.filter((o) => o.status !== "draft");

  return (
    <div className="container-narrow">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl">Studio</h1>
        <Link href="/admin/catalogue" className="btn-ghost text-sm">
          Catalogue
        </Link>
      </div>
      <p className="mt-1 text-ink/60">Production status board.</p>

      {error && (
        <p className="mt-6 rounded-lg border border-clay/40 bg-clay/5 p-4 text-sm text-clay">
          Database unavailable: {error}
        </p>
      )}

      <div className="mt-8 overflow-hidden rounded-2xl border border-ink/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/60 text-xs uppercase tracking-wide text-ink/50">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Order status</th>
              <th className="px-4 py-3">Pipeline</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {paidOrders.map((order) => (
              <tr key={order.id} className="align-top">
                <td className="px-4 py-3 font-mono text-xs">
                  <Link
                    href={`/order/${order.id}/confirmation`}
                    className="hover:text-clay"
                  >
                    {order.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {order.customer?.name ?? order.customer?.email ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {order.items.map((it) => (
                    <div key={it.id} className="text-ink/70">
                      {it.style.name}{" "}
                      <span className="text-ink/40">· {it.fabric.name}</span>
                    </div>
                  ))}
                </td>
                <td className="px-4 py-3">
                  {STATUS_LABEL[order.status] ?? order.status}
                </td>
                <td className="px-4 py-3 space-y-1">
                  {order.items.map((it) => (
                    <div key={it.id}>
                      {it.jobs[0] ? (
                        <StatusBadge status={it.jobs[0].status} />
                      ) : (
                        <span className="text-xs text-ink/40">no job</span>
                      )}
                    </div>
                  ))}
                </td>
              </tr>
            ))}
            {paidOrders.length === 0 && !error && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink/40">
                  No paid orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
