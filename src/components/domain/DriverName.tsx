import Link from "next/link";
import { cn } from "@/lib/cn";
import { needsOutline } from "@/lib/colors";

type DriverNameProps = {
  name: string;
  /** Car color for the team stripe; neutral stripe when unknown */
  color?: string | null;
  /** Links the name to the driver's profile */
  username?: string | null;
  /** Secondary line under the name, e.g. a race note */
  detail?: React.ReactNode;
  className?: string;
};

/** Broadcast-style driver label: car-color stripe + name in caps. */
export function DriverName({ name, color, username, detail, className }: DriverNameProps) {
  const label = <span className="truncate pr-1 font-display text-base font-bold uppercase tracking-wide">{name}</span>;
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2.5", className)}>
      <span
        aria-hidden
        className={cn(
          "h-6 w-1.5 shrink-0 -skew-x-12 bg-border-strong",
          color && needsOutline(color) && "ring-1 ring-border-strong",
        )}
        style={color ? { backgroundColor: color } : undefined}
      />
      <span className="flex min-w-0 flex-col">
        {username ? (
          <Link href={`/pilotos/${username}`} className="flex min-w-0 hover:text-primary hover:underline">
            {label}
          </Link>
        ) : (
          label
        )}
        {detail && <span className="text-xs font-normal text-fg-muted italic">{detail}</span>}
      </span>
    </span>
  );
}
