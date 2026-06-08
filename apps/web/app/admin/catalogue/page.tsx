import Link from "next/link";
import { getActiveFabrics, getAllCollectionsWithStyles } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function CataloguePage() {
  let collections: Awaited<
    ReturnType<typeof getAllCollectionsWithStyles>
  > = [];
  let fabrics: Awaited<ReturnType<typeof getActiveFabrics>> = [];
  let error: string | null = null;
  try {
    [collections, fabrics] = await Promise.all([
      getAllCollectionsWithStyles(),
      getActiveFabrics(),
    ]);
  } catch (err) {
    error = (err as Error).message;
  }

  return (
    <div className="container-narrow">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl">Catalogue</h1>
        <Link href="/admin" className="btn-ghost text-sm">
          ← Board
        </Link>
      </div>

      {error && (
        <p className="mt-6 rounded-lg border border-clay/40 bg-clay/5 p-4 text-sm text-clay">
          Database unavailable: {error}
        </p>
      )}

      <section className="mt-8">
        <h2 className="font-serif text-xl">Collections &amp; styles</h2>
        <div className="mt-4 space-y-4">
          {collections.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-ink/10 bg-white/40 p-4"
            >
              <div className="flex justify-between">
                <span className="font-medium">{c.name}</span>
                <span className="text-sm text-ink/50">
                  {c.season} {c.year} {c.isActive ? "" : "· inactive"}
                </span>
              </div>
              <ul className="mt-2 text-sm text-ink/70">
                {c.styles.map((s) => (
                  <li key={s.id}>
                    {s.name}{" "}
                    <span className="capitalize text-ink/40">· {s.kind}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-xl">Fabrics &amp; stock</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-ink/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/60 text-xs uppercase text-ink/50">
              <tr>
                <th className="px-4 py-2">Fabric</th>
                <th className="px-4 py-2">Base cloth</th>
                <th className="px-4 py-2">£/m</th>
                <th className="px-4 py-2">Stock (m)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {fabrics.map((f) => (
                <tr key={f.id}>
                  <td className="px-4 py-2">{f.name}</td>
                  <td className="px-4 py-2 capitalize">{f.baseCloth}</td>
                  <td className="px-4 py-2">
                    {Number(f.pricePerMetre).toFixed(2)}
                  </td>
                  <td className="px-4 py-2">{Number(f.stockMetres).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-8 text-sm text-ink/40">
        Add/edit forms for collections, styles and fabrics land in Phase 3.
      </p>
    </div>
  );
}
