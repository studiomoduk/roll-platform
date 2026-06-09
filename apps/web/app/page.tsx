import Link from "next/link";
import { getActiveCollections } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let collections: Awaited<ReturnType<typeof getActiveCollections>> = [];
  let dbError: string | null = null;
  try {
    collections = await getActiveCollections();
  } catch (err) {
    dbError = (err as Error).message;
  }

  return (
    <div className="container-narrow">
      <section className="max-w-2xl py-6">
        <h1 className="font-serif text-4xl leading-tight">
          Choose a style from the archive. Choose a print. We make it for you.
        </h1>
        <p className="mt-4 text-ink/70">
          Nothing is held in stock. When you order, your garment is printed,
          cut and sewn to length in the micro-factory — the cut lines and
          sewing guides are printed straight onto the cloth.
        </p>
      </section>

      {dbError && (
        <div className="my-6 rounded-lg border border-clay/40 bg-clay/5 p-4 text-sm text-clay">
          <p className="font-medium">Catalogue unavailable.</p>
          <p className="mt-1 text-clay/80">
            The database isn&apos;t reachable yet. Set <code>DATABASE_URL</code>{" "}
            and run <code>pnpm db:migrate &amp;&amp; pnpm db:seed</code>.
          </p>
          <p className="mt-1 font-mono text-xs text-clay/60">{dbError}</p>
        </div>
      )}

      <div className="mt-10 space-y-12">
        {collections.map((collection) => (
          <section key={collection.id}>
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-2xl">{collection.name}</h2>
              <span className="text-sm text-ink/50">
                {collection.season} {collection.year}
              </span>
            </div>
            {collection.blurb && (
              <p className="mt-1 max-w-xl text-sm text-ink/60">
                {collection.blurb}
              </p>
            )}
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {collection.styles.map((style) => (
                <Link
                  key={style.id}
                  href={`/styles/${style.id}`}
                  className="group rounded-2xl border border-ink/10 bg-white/40 p-5 transition hover:border-clay/50"
                >
                  <div className="aspect-[3/4] rounded-xl bg-sand/70" />
                  <h3 className="mt-4 font-serif text-lg group-hover:text-clay">
                    {style.name}
                  </h3>
                  <p className="text-sm capitalize text-ink/50">{style.kind}</p>
                </Link>
              ))}
              {collection.styles.length === 0 && (
                <p className="text-sm text-ink/50">No styles yet.</p>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
