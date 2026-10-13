import { cva } from "class-variance-authority";
import { cn } from "@/lib/cn";

/** Timing-tower position box: podium colors, inverse box for the rest. */
const positionVariants = cva(
  "inline-flex items-center justify-center font-display font-bold italic tabular-nums leading-none",
  {
    variants: {
      place: {
        1: "bg-gold text-black",
        2: "bg-silver text-black",
        3: "bg-bronze text-white",
        other: "bg-fg text-background",
        dnf: "bg-danger-solid text-white",
      },
      size: {
        sm: "h-6 min-w-7 px-1 text-sm",
        md: "h-8 min-w-9 px-1.5 text-lg",
        lg: "h-12 min-w-13 px-2 text-3xl",
      },
    },
    defaultVariants: { size: "md" },
  },
);

type PositionBadgeProps = {
  /** Finishing position; null/undefined means retired (did not finish). */
  position?: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function PositionBadge({ position, size, className }: PositionBadgeProps) {
  const place =
    position == null
      ? "dnf"
      : position === 1 || position === 2 || position === 3
        ? position
        : "other";

  return (
    <span
      className={cn(positionVariants({ place, size }), className)}
      aria-label={position == null ? "Retirado" : `Posición ${position}`}
    >
      {position == null ? "RET" : position}
    </span>
  );
}
