import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap clip-slant px-3 py-0.5 font-display text-xs font-bold uppercase italic tracking-wide [&_svg]:size-3",
  {
    variants: {
      tone: {
        neutral: "bg-surface-2 text-fg-muted",
        primary: "bg-primary text-primary-fg",
        accent: "bg-accent text-accent-fg",
        success: "bg-success/20 text-success",
        warning: "bg-warning/20 text-warning",
        danger: "bg-danger/20 text-danger",
        info: "bg-info/20 text-info",
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
