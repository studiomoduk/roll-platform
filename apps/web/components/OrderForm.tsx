"use client";

import { useMemo, useState } from "react";
import { estimatePrice } from "@/lib/pricing";

type StyleLite = {
  id: string;
  name: string;
  kind: string;
  baseLengthCm: string | null;
  stage2MinCm: string | null;
  stage2MaxCm: string | null;
};

type FabricLite = {
  id: string;
  name: string;
  baseCloth: string;
  pricePerMetre: string | null;
  imageUrl: string | null;
};

const SIZES = ["UK 8", "UK 10", "UK 12", "UK 14", "UK 16", "UK 18"];

export function OrderForm({
  style,
  fabrics,
}: {
  style: StyleLite;
  fabrics: FabricLite[];
}) {
  const [fabricId, setFabricId] = useState(fabrics[0]?.id ?? "");
  const [size, setSize] = useState("");
  const [stage, setStage] = useState<1 | 2>(1);
  const [lengthAdj, setLengthAdj] = useState(0);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fabric = fabrics.find((f) => f.id === fabricId);
  const minCm = Number(style.stage2MinCm ?? -10);
  const maxCm = Number(style.stage2MaxCm ?? 10);

  const quote = useMemo(() => {
    if (!fabric) return null;
    return estimatePrice(
      { baseLengthCm: style.baseLengthCm, kind: style.kind as never },
      { pricePerMetre: fabric.pricePerMetre },
      stage === 2 ? lengthAdj : 0,
    );
  }, [fabric, style, stage, lengthAdj]);

  const canSubmit = fabricId && size && email && !submitting;

  async function handleOrder() {
    setError(null);
    if (!canSubmit) {
      setError("Please choose a fabric, a size, and enter your email.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          styleId: style.id,
          fabricId,
          size,
          stage,
          lengthAdjCm: stage === 2 ? lengthAdj : 0,
          email,
          name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed.");
      if (data.url) {
        window.location.href = data.url as string;
      } else if (data.orderId) {
        // Stripe not configured — go straight to confirmation (dev mode).
        window.location.href = `/order/${data.orderId}/confirmation`;
      }
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-7">
      {/* Fabric / print */}
      <fieldset>
        <legend className="text-sm font-medium">Print &amp; cloth</legend>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fabrics.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFabricId(f.id)}
              className={`rounded-xl border p-3 text-left transition ${
                fabricId === f.id
                  ? "border-clay bg-clay/5"
                  : "border-ink/15 hover:border-ink/30"
              }`}
            >
              <div className="aspect-video overflow-hidden rounded-lg bg-sand/70">
                {f.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={f.imageUrl}
                    alt={f.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <p className="mt-2 text-sm font-medium">{f.name}</p>
              <p className="text-xs capitalize text-ink/50">{f.baseCloth}</p>
            </button>
          ))}
        </div>
      </fieldset>

      {/* Size / fit */}
      <fieldset>
        <legend className="text-sm font-medium">Size</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                size === s
                  ? "border-clay bg-clay text-cloth"
                  : "border-ink/20 hover:border-ink/40"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink/50">
          Not sure of your size?{" "}
          <a href="mailto:hello@palava.example" className="underline">
            Ask for sizing help
          </a>
          .
        </p>
      </fieldset>

      {/* Fit stage */}
      <fieldset>
        <legend className="text-sm font-medium">Length</legend>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setStage(1)}
            className={`rounded-full border px-4 py-2 text-sm ${
              stage === 1
                ? "border-clay bg-clay text-cloth"
                : "border-ink/20 hover:border-ink/40"
            }`}
          >
            Standard length
          </button>
          <button
            type="button"
            onClick={() => setStage(2)}
            className={`rounded-full border px-4 py-2 text-sm ${
              stage === 2
                ? "border-clay bg-clay text-cloth"
                : "border-ink/20 hover:border-ink/40"
            }`}
          >
            Adjust the hem
          </button>
        </div>
        {stage === 2 && (
          <div className="mt-4">
            <label className="text-xs text-ink/60">
              Hem adjustment: {lengthAdj > 0 ? "+" : ""}
              {lengthAdj} cm ({minCm} to {maxCm} cm)
            </label>
            <input
              type="range"
              min={minCm}
              max={maxCm}
              step={1}
              value={lengthAdj}
              onChange={(e) => setLengthAdj(Number(e.target.value))}
              className="mt-2 w-full accent-clay"
            />
          </div>
        )}
      </fieldset>

      {/* Customer */}
      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <legend className="text-sm font-medium">Your details</legend>
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-3 rounded-lg border border-ink/20 px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-ink/20 px-3 py-2 text-sm sm:mt-3"
        />
      </fieldset>

      {/* Quote */}
      {quote && (
        <div className="rounded-xl bg-white/50 p-4 text-sm">
          <div className="flex justify-between text-ink/60">
            <span>Fabric (~{quote.fabricMetres} m)</span>
            <span>£{quote.fabricCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-ink/60">
            <span>Make &amp; print</span>
            <span>£{quote.makeCost.toFixed(2)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-ink/10 pt-2 font-medium">
            <span>Estimated total</span>
            <span>£{quote.total.toFixed(2)}</span>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-clay">{error}</p>}

      <button
        type="button"
        onClick={handleOrder}
        disabled={!canSubmit}
        className="btn-primary w-full"
      >
        {submitting ? "Starting checkout…" : "Order — make it for me"}
      </button>
    </div>
  );
}
