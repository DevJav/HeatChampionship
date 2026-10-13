import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap clip-slant px-3 py-0.5 font-display text-xs font-bold uppercase italic tracking-wide [&_svg]:size-3",
  {
    variants: {
      tone: {
        neutral: "bg-border text-fg-muted",
        primary: "bg-primary text-primary-fg",
        accent: "bg-accent text-accent-fg",
        success: "bg-success text-white",
        warning: "bg-warning text-white",
        danger: "bg-danger-solid text-white",
        info: "bg-info text-white",
        bar: "surface-bar",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
