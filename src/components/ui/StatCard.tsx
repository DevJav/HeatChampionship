import { cn } from "@/lib/cn";
import { Card } from "./Card";

type StatCardProps = {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
};

export function StatCard({ label, value, hint, icon, className }: StatCardProps) {
  return (
    <Card className={cn("gap-1 border-l-4 border-primary p-4", className)}>
      <div className="flex items-center justify-between gap-2 text-fg-muted">
        <span className="font-display text-xs font-bold uppercase tracking-wider">
          {label}
        </span>
        {icon && <span className="[&_svg]:size-4">{icon}</span>}
      </div>
      <div className="font-display text-4xl font-bold italic tabular-nums leading-none">
        {value}
      </div>
      {hint && <div className="text-xs text-fg-subtle">{hint}</div>}
    </Card>
  );
}
