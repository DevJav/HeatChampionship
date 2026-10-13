import { cn } from "@/lib/cn";
import { formatDecimal } from "@/lib/format";

/** ▲3 / ▼2 / = — places gained from the starting grid (or an average, ▲1,5). */
export function PositionsGained({ value, className }: { value: number | null; className?: string }) {
  if (value == null) return <span className={cn("text-fg-subtle", className)}>—</span>;
  // Averages show one decimal; the sign follows what's displayed
  value = Math.round(value * 10) / 10;
  const amount = formatDecimal(Math.abs(value));
  const label = value > 0 ? `Ganó ${amount} posiciones` : value < 0 ? `Perdió ${amount} posiciones` : "Mantuvo la posición";
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
      {value > 0 ? `▲${amount}` : value < 0 ? `▼${amount}` : "="}
    </span>
  );
}
