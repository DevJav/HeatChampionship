import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import { needsOutline, readableTextOn } from "@/lib/colors";

const avatarVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-control bg-surface-2 font-display font-bold italic text-fg-muted",
  {
    variants: {
      size: {
        sm: "size-7",
        md: "size-10",
        lg: "size-16",
        xl: "size-24",
      },
    },
    defaultVariants: { size: "md" },
  },
);

type AvatarProps = VariantProps<typeof avatarVariants> & {
  name: string;
  src?: string | null;
  /** Optional background color, e.g. the player's car color. */
  color?: string | null;
  className?: string;
};

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase();
}

/** Default picture: a driver in a helmet with their initial on the dome, drawn in the text color. */
function HelmetPicture({ letter }: { letter: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className="size-full"
      fill="none"
      stroke="currentColor"
      strokeWidth={6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* Neck and shoulders, running off the bottom edge */}
      <path d="M35 78V83Q35 88 27 90Q10 94 4 108M65 78V83Q65 88 73 90Q90 94 96 108" />
      {/* Visor: a tinted band between two curves */}
      <path d="M14 40Q50 56 86 40L85.5 58Q50 74 14.5 58Z" fill="currentColor" fillOpacity={0.25} stroke="none" />
      <path d="M14 40Q50 56 86 40M14.5 58Q50 74 85.5 58" />
      {/* Shell */}
      <path d="M14 52C14 22 30 6 50 6C70 6 86 22 86 52L85 70Q84 78 76 78H24Q16 78 15 70Z" />
      {/* Nudged left: the italic slant leans the ink right */}
      <text x="48" y="28" fontSize="34" textAnchor="middle" dominantBaseline="central" fill="currentColor" stroke="none">
        {letter}
      </text>
    </svg>
  );
}

export function Avatar({ name, src, color, size, className }: AvatarProps) {
  return (
    <span
      className={cn(avatarVariants({ size }), color && needsOutline(color) && "ring-1 ring-border-strong ring-inset", className)}
      // Text color follows the background so white/yellow cars stay readable
      style={color ? { backgroundColor: color, color: readableTextOn(color) } : undefined}
      title={name}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- user uploads, served locally
        <img src={src} alt={name} className="size-full object-cover" />
      ) : (
        <HelmetPicture letter={initial(name)} />
      )}
    </span>
  );
}
