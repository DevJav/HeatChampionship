import { cn } from "@/lib/cn";

type SeatsMeterProps = {
  taken: number;
  max: number;
  className?: string;
};

/** Row of slanted blocks, one per seat — like a broadcast lap counter. */
export function SeatsMeter({ taken, max, className }: SeatsMeterProps) {
  const full = taken >= max;
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: max }, (_, i) => (
          <span
            key={i}
            className={cn("h-4 w-3 -skew-x-12", i < taken ? (full ? "bg-accent" : "bg-primary") : "bg-border")}
          />
        ))}
      </div>
      <span className="font-display text-sm font-bold italic tabular-nums">
        {taken}/{max} <span className="font-normal not-italic text-fg-muted">{full ? "completo" : "plazas"}</span>
      </span>
    </div>
  );
}
