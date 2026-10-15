import { cn } from "@/lib/cn";
import { t } from "@/i18n";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label={t.forms.loading}
      className={cn(
        "inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent",
        className,
      )}
    />
  );
}
