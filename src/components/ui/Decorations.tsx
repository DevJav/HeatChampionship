import { cn } from "@/lib/cn";

/** Strip of checkered flag, in the current text color. */
export function ChequeredStrip({ className }: { className?: string }) {
  return <div aria-hidden className={cn("chequered h-3 w-full", className)} />;
}

/** Diagonal red racing stripes; position it absolutely inside a relative parent. */
export function SpeedStripes({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "speed-stripes pointer-events-none [mask-image:linear-gradient(90deg,transparent,black_60%)]",
        className,
      )}
    />
  );
}
