import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const avatarVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-control bg-surface-2 font-display font-bold italic text-fg-muted",
  {
    variants: {
      size: {
        sm: "size-7 text-xs",
        md: "size-10 text-sm",
        lg: "size-16 text-xl",
        xl: "size-24 text-3xl",
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

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function Avatar({ name, src, color, size, className }: AvatarProps) {
  return (
    <span
      className={cn(avatarVariants({ size }), className)}
      style={color ? { backgroundColor: color, color: "#fff" } : undefined}
      title={name}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- user uploads, served locally
        <img src={src} alt={name} className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
