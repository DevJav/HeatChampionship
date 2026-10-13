import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

/**
 * The one place button styles live. Use <Button> for actions and
 * <ButtonLink> for navigation — both share these variants.
 */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-display font-bold uppercase italic tracking-wide transition-[background-color,color,filter] clip-slant focus-inset disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-fg gloss hover:bg-primary-hover",
        accent: "bg-accent text-accent-fg gloss hover:bg-accent-hover",
        secondary: "bg-surface-2 text-fg hover:bg-border",
        ghost: "text-fg hover:bg-surface-2",
        /** For use on top of broadcast bars (header, hero) in either theme */
        inverse: "text-bar-fg hover:bg-white/10",
        danger: "bg-danger-solid text-white gloss hover:bg-danger-solid-hover",
        link: "text-primary normal-case not-italic underline-offset-4 [clip-path:none] hover:underline",
      },
      size: {
        sm: "h-8 px-4 text-sm",
        md: "h-10 px-5 text-base",
        lg: "h-12 px-7 text-lg",
        icon: "size-10 [clip-path:none]",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;

type ButtonProps = React.ComponentProps<"button"> &
  ButtonVariantProps & {
    loading?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  fullWidth,
  loading = false,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

type ButtonLinkProps = React.ComponentProps<typeof Link> & ButtonVariantProps;

export function ButtonLink({
  className,
  variant,
  size,
  fullWidth,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      {...props}
    />
  );
}
