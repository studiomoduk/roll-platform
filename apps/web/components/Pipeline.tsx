// The production_jobs pipeline, shown on the confirmation screen and admin board.
// Mirrors packages/db productionStatusEnum, in order.
export const PIPELINE_STEPS = [
  { key: "queued", label: "Queued" },
  { key: "pattern_ready", label: "Pattern retrieved" },
  { key: "nested", label: "Lay nested" },
  { key: "print_ready", label: "Print file ready" },
  { key: "printed", label: "Printed" },
  { key: "fixed", label: "Fixed" },
  { key: "cut", label: "Cut" },
  { key: "sewn", label: "Sewn" },
  { key: "packed", label: "Packed" },
  { key: "shipped", label: "Shipped" },
] as const;

export type PipelineStatus =
  | (typeof PIPELINE_STEPS)[number]["key"]
  | "failed";

export function pipelineIndex(status: string): number {
  return PIPELINE_STEPS.findIndex((s) => s.key === status);
}

export function Pipeline({ status }: { status: string }) {
  const current = pipelineIndex(status);
  const failed = status === "failed";

  return (
    <ol className="space-y-2">
      {PIPELINE_STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step.key} className="flex items-center gap-3 text-sm">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                done
                  ? "bg-sage text-cloth"
                  : active
                    ? "bg-clay text-cloth"
                    : "bg-ink/10 text-ink/40"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <span
              className={
                active ? "font-medium" : done ? "text-ink/60" : "text-ink/40"
              }
            >
              {step.label}
            </span>
          </li>
        );
      })}
      {failed && (
        <li className="text-sm text-clay">⚠ Production failed — see job error.</li>
      )}
    </ol>
  );
}

/** Compact one-line badge for the admin board. */
export function StatusBadge({ status }: { status: string }) {
  const failed = status === "failed";
  const step = PIPELINE_STEPS.find((s) => s.key === status);
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs ${
        failed
          ? "bg-clay/15 text-clay"
          : status === "shipped"
            ? "bg-sage/20 text-sage"
            : "bg-ink/10 text-ink/70"
      }`}
    >
      {failed ? "failed" : (step?.label ?? status)}
    </span>
  );
}
