import { notFound } from "next/navigation";
import Link from "next/link";
import { getStyle, getActiveFabrics } from "@/lib/queries";
import { OrderForm } from "@/components/OrderForm";

export const dynamic = "force-dynamic";

export default async function StylePage({
  params,
}: {
  params: Promise<{ styleId: string }>;
}) {
  const { styleId } = await params;

  const [style, fabrics] = await Promise.all([
    getStyle(styleId),
    getActiveFabrics(),
  ]);

  if (!style) notFound();

  return (
    <div className="container-narrow">
      <Link href="/" className="text-sm text-ink/50 hover:text-clay">
        ← Back to the archive
      </Link>

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-sand/70">
            {style.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={style.imageUrl}
                alt={style.name}
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <p className="mt-3 text-xs text-ink/40">
            {style.collection.name} · {style.collection.season}{" "}
            {style.collection.year}
          </p>
        </div>

        <div>
          <h1 className="font-serif text-3xl">{style.name}</h1>
          <p className="mt-1 capitalize text-ink/50">{style.kind}</p>
          <p className="mt-4 text-sm text-ink/70">
            Base length {Number(style.baseLengthCm)} cm. Made to order in your
            chosen print and size.
          </p>

          <div className="mt-8">
            <OrderForm
              style={{
                id: style.id,
                name: style.name,
                kind: style.kind,
                baseLengthCm: style.baseLengthCm,
                stage2MinCm: style.stage2MinCm,
                stage2MaxCm: style.stage2MaxCm,
              }}
              fabrics={fabrics.map((f) => ({
                id: f.id,
                name: f.name,
                baseCloth: f.baseCloth,
                pricePerMetre: f.pricePerMetre,
                imageUrl: f.printArtworkUrl,
              }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
