import { cn } from "@/lib/cn";

/**
 * Timing-tower style table: broadcast-bar header, alternating rows.
 * Scrolls horizontally on small screens instead of breaking the layout.
 */
export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn("w-full border-collapse text-sm", className)}
        {...props}
      />
    </div>
  );
}

export function THead({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      className={cn("surface-bar border-b-2 border-primary", className)}
      {...props}
    />
  );
}

export function TBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      className={cn(
        "[&>tr:nth-child(odd)]:bg-surface [&>tr:nth-child(even)]:bg-surface-2",
        className,
      )}
      {...props}
    />
  );
}

export function Tr({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "border-b border-border/60 transition-colors last:border-b-0 hover:bg-primary/10!",
        className,
      )}
      {...props}
    />
  );
}

type CellAlign = { align?: "left" | "center" | "right" };

const alignClass = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export function Th({
  className,
  align = "left",
  ...props
}: React.ComponentProps<"th"> & CellAlign) {
  return (
    <th
      className={cn(
        "px-4 py-2 font-display text-xs font-bold uppercase italic tracking-wider text-bar-fg/80",
        alignClass[align],
        className,
      )}
      {...props}
    />
  );
}

export function Td({
  className,
  align = "left",
  ...props
}: React.ComponentProps<"td"> & CellAlign) {
  return (
    <td
      className={cn("px-4 py-2.5 tabular-nums", alignClass[align], className)}
      {...props}
    />
  );
}
