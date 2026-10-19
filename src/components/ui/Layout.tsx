import { cn } from "@/lib/cn";
import { Badge } from "./Badge";

/** Centers content at the page width set by --page-max-width. */
export function Container({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-page px-4 sm:px-6", className)}
      {...props}
    />
  );
}

type PageHeaderProps = {
  title: string;
  description?: React.ReactNode;
  /** Small red tag above the title, e.g. "Temporada 2026". */
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 pb-8 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="flex flex-col items-start gap-2">
        {eyebrow && <Badge tone="primary">{eyebrow}</Badge>}
        <h1 className="text-5xl sm:text-6xl">{title}</h1>
        {description && <p className="text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </header>
  );
}

type SectionProps = Omit<React.ComponentProps<"section">, "title"> & {
  title?: string;
  actions?: React.ReactNode;
};

/** Content block with a heading marked by a slanted red bar. */
export function Section({ title, actions, className, children, ...props }: SectionProps) {
  return (
    <section className={cn("flex flex-col gap-4", className)} {...props}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          {title && (
            <h2 className="flex items-center gap-3 text-2xl">
              <span aria-hidden className="h-6 w-2 -skew-x-12 bg-primary" />
              {title}
            </h2>
          )}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
