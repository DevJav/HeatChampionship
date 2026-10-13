import { cn } from "@/lib/cn";

/** ▲3 / ▼2 / = — places gained from the starting grid. */
export function PositionsGained({ value, className }: { value: number | null; className?: string }) {
  if (value == null) return <span className={cn("text-fg-subtle", className)}>—</span>;
  const label =
    value > 0 ? `Ganó ${value} posiciones` : value < 0 ? `Perdió ${-value} posiciones` : "Mantuvo la posición";
  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "font-display text-sm font-bold italic tabular-nums",
        value > 0 ? "text-success" : value < 0 ? "text-danger" : "text-fg-muted",
        className,
      )}
    >
      {value > 0 ? `▲${value}` : value < 0 ? `▼${-value}` : "="}
    </span>
  );
}
