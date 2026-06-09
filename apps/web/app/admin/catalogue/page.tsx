import Link from "next/link";
import { getActiveFabrics, getAllCollectionsWithStyles } from "@/lib/queries";
import { db } from "@palava/db";
import {
  createCollection,
  createStyle,
  createFabric,
  updateFabric,
  toggleFabricActive,
  toggleStyleActive,
  toggleCollectionActive,
} from "./actions";

export const dynamic = "force-dynamic";

const STYLE_KINDS = [
  "dress",
  "pinafore",
  "blouse",
  "skirt",
  "top",
  "trousers",
] as const;
const PRINT_MODES = ["repeat", "engineered"] as const;

const inputCls =
  "rounded-lg border border-ink/20 bg-white px-3 py-2 text-sm w-full";

export default async function CataloguePage() {
  let collections: Awaited<
    ReturnType<typeof getAllCollectionsWithStyles>
  > = [];
  let fabrics: Awaited<ReturnType<typeof db.query.fabrics.findMany>> = [];
  let error: string | null = null;
  try {
    [collections, fabrics] = await Promise.all([
      getAllCollectionsWithStyles(),
      db.query.fabrics.findMany(),
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

      {/* ---------------------------------------------------------------- */}
      {/* Collections & styles                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="mt-8">
        <h2 className="font-serif text-xl">Collections &amp; styles</h2>

        <div className="mt-4 space-y-4">
          {collections.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-ink/10 bg-white/40 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {c.name}{" "}
                  <span className="text-sm font-normal text-ink/50">
                    · {c.season} {c.year}
                  </span>
                </span>
                <form action={toggleCollectionActive}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="text-xs text-ink/50 hover:text-clay">
                    {c.isActive ? "Active ✓ — hide" : "Hidden — show"}
                  </button>
                </form>
              </div>

              <ul className="mt-2 space-y-1 text-sm text-ink/70">
                {c.styles.map((s) => (
                  <li key={s.id} className="flex items-center justify-between">
                    <span>
                      {s.name}{" "}
                      <span className="capitalize text-ink/40">· {s.kind}</span>
                      {!s.isActive && (
                        <span className="ml-2 text-xs text-clay">hidden</span>
                      )}
                    </span>
                    <form action={toggleStyleActive}>
                      <input type="hidden" name="id" value={s.id} />
                      <button className="text-xs text-ink/40 hover:text-clay">
                        {s.isActive ? "hide" : "show"}
                      </button>
                    </form>
                  </li>
                ))}
                {c.styles.length === 0 && (
                  <li className="text-ink/40">No styles yet.</li>
                )}
              </ul>

              {/* Add style to this collection */}
              <form
                action={createStyle}
                className="mt-3 grid grid-cols-2 gap-2 border-t border-ink/10 pt-3 sm:grid-cols-6"
              >
                <input type="hidden" name="collectionId" value={c.id} />
                <input
                  name="name"
                  placeholder="New style name"
                  required
                  className={`${inputCls} col-span-2`}
                />
                <select name="kind" className={inputCls} defaultValue="dress">
                  {STYLE_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
                <input
                  name="baseLengthCm"
                  type="number"
                  step="0.5"
                  placeholder="len cm"
                  className={inputCls}
                />
                <input
                  name="stage2MinCm"
                  type="number"
                  step="1"
                  placeholder="min"
                  className={inputCls}
                />
                <button className="btn-ghost text-sm">Add style</button>
              </form>
            </div>
          ))}
        </div>

        {/* Add collection */}
        <form
          action={createCollection}
          className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-dashed border-ink/20 p-4 sm:grid-cols-5"
        >
          <input
            name="name"
            placeholder="New collection name"
            required
            className={`${inputCls} col-span-2`}
          />
          <input name="season" placeholder="Season" className={inputCls} />
          <input
            name="year"
            type="number"
            placeholder="Year"
            className={inputCls}
          />
          <button className="btn-primary text-sm">Add collection</button>
        </form>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Fabrics & stock                                                  */}
      {/* ---------------------------------------------------------------- */}
      <section className="mt-10">
        <h2 className="font-serif text-xl">Fabrics &amp; stock</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-ink/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/60 text-xs uppercase text-ink/50">
              <tr>
                <th className="px-4 py-2">Fabric</th>
                <th className="px-4 py-2">Base cloth</th>
                <th className="px-4 py-2">Print</th>
                <th className="px-4 py-2">£/m &amp; stock (m)</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {fabrics.map((f) => (
                <tr key={f.id} className={f.isActive ? "" : "opacity-50"}>
                  <td className="px-4 py-2">{f.name}</td>
                  <td className="px-4 py-2 capitalize">{f.baseCloth}</td>
                  <td className="px-4 py-2 capitalize">{f.printMode}</td>
                  <td className="px-4 py-2">
                    <form
                      action={updateFabric}
                      className="flex items-center gap-2"
                    >
                      <input type="hidden" name="id" value={f.id} />
                      <input
                        name="pricePerMetre"
                        type="number"
                        step="0.5"
                        defaultValue={Number(f.pricePerMetre ?? 0)}
                        className="w-20 rounded border border-ink/20 px-2 py-1"
                      />
                      <input
                        name="stockMetres"
                        type="number"
                        step="0.1"
                        defaultValue={Number(f.stockMetres)}
                        className="w-24 rounded border border-ink/20 px-2 py-1"
                      />
                      <button className="text-xs text-clay hover:underline">
                        save
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <form action={toggleFabricActive}>
                      <input type="hidden" name="id" value={f.id} />
                      <button className="text-xs text-ink/40 hover:text-clay">
                        {f.isActive ? "deactivate" : "activate"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add fabric */}
        <form
          action={createFabric}
          className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-dashed border-ink/20 p-4 sm:grid-cols-6"
        >
          <input
            name="name"
            placeholder="Fabric name"
            required
            className={`${inputCls} col-span-2`}
          />
          <input
            name="baseCloth"
            placeholder="Base cloth"
            required
            className={inputCls}
          />
          <select name="printMode" className={inputCls} defaultValue="repeat">
            {PRINT_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <input
            name="pricePerMetre"
            type="number"
            step="0.5"
            placeholder="£/m"
            className={inputCls}
          />
          <button className="btn-primary text-sm">Add fabric</button>
        </form>
      </section>
    </div>
  );
}
