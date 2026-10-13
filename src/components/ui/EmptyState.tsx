import { cn } from "@/lib/cn";

type EmptyStateProps = {
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 border border-dashed border-border-strong px-6 py-12 text-center",
        className,
      )}
    >
      {icon && <div className="text-fg-subtle [&_svg]:size-10">{icon}</div>}
      <h3 className="text-xl">{title}</h3>
      {description && (
        <p className="max-w-md text-sm text-fg-muted">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
