import { Tornado } from "lucide-react";
import { cn } from "@/lib/cn";
import { t } from "@/i18n";

/** Spin-outs (trompos) in a race: a swirl and the count, a quiet dash when none. */
export function SpinCount({ spins, className }: { spins: number; className?: string }) {
  if (spins === 0) return <span className={cn("text-fg-subtle", className)}>—</span>;
  const label = t.common.spins(spins);
  return (
    <span
      title={label}
      aria-label={label}
      className={cn("inline-flex items-center gap-1 font-display text-sm font-bold italic tabular-nums text-warning", className)}
    >
      <Tornado aria-hidden className="size-4" />
      {spins}
    </span>
  );
}
