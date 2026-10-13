import { cn } from "@/lib/cn";

type ChartTooltipProps = {
  title: React.ReactNode;
  /** Absolute placement inside the chart's relative wrapper */
  style?: React.CSSProperties;
  className?: string;
  children: React.ReactNode;
};

/** Readout box shown next to the hovered or focused mark. */
export function ChartTooltip({ title, style, className, children }: ChartTooltipProps) {
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-none absolute z-10 min-w-40 border-l-4 border-primary bg-surface p-3 text-sm shadow-overlay",
        className,
      )}
      style={style}
    >
      <p className="mb-1.5 font-display text-xs font-bold uppercase italic tracking-wide text-fg-muted">{title}</p>
      {children}
    </div>
  );
}
