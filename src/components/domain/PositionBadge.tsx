import { cva } from "class-variance-authority";
import { cn } from "@/lib/cn";

/**
 * Timing-tower position tag: slanted, bold italic number. Podium places are
 * gold/silver/bronze, the rest dark like a broadcast bar, retirements red.
 */
const positionVariants = cva(
  "inline-flex shrink-0 items-center justify-center clip-slant gloss font-display font-bold italic leading-none tabular-nums",
  {
    variants: {
      place: {
        1: "bg-gold text-black",
        2: "bg-silver text-black",
        3: "bg-bronze text-white",
        other: "surface-bar",
        dnf: "bg-danger-solid text-white",
      },
      size: {
        sm: "h-7 w-11 text-lg",
        md: "h-9 w-14 text-2xl",
        lg: "h-14 w-20 text-4xl",
      },
    },
    // "RET" is three letters: smaller than a number at each size
    compoundVariants: [
      { place: "dnf", size: "sm", className: "text-xs" },
      { place: "dnf", size: "md", className: "text-base" },
      { place: "dnf", size: "lg", className: "text-2xl" },
    ],
    defaultVariants: { size: "md" },
  },
);

type PositionBadgeProps = {
  /** Finishing position; null/undefined means retired (did not finish). */
  position?: number | null;
  size?: "sm" | "md" | "lg";
  /** Always use the dark tag, e.g. for starting-grid slots (no podium colors) */
  neutral?: boolean;
  className?: string;
};

export function PositionBadge({ position, size, neutral = false, className }: PositionBadgeProps) {
  const place = neutral
    ? "other"
    : position == null
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
