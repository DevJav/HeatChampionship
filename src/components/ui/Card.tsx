import { cn } from "@/lib/cn";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-card surface-panel clip-chamfer text-fg",
        className,
      )}
      {...props}
    />
  );
}

/** Dark broadcast bar with a red stripe on the left. */
export function CardHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-l-4 border-primary surface-bar px-5 py-3",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 className={cn("text-xl", className)} {...props} />;
}

/** Uses opacity rather than a color so it reads on both bars and panels. */
export function CardDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return <p className={cn("text-sm opacity-70", className)} {...props} />;
}

export function CardBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex-1 px-5 py-4", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2 border-t border-border bg-surface-2/50 px-5 py-3",
        className,
      )}
      {...props}
    />
  );
}
