import { cn } from "@/lib/cn";

type CarColorChipProps = {
  name: string;
  hex: string;
  /** Hide the text label and only show the swatch. */
  swatchOnly?: boolean;
  className?: string;
};

export function CarColorChip({ name, hex, swatchOnly, className }: CarColorChipProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-sm", className)}
      title={name}
    >
      <span
        className="size-3.5 shrink-0 rounded-full ring-1 ring-fg/30 ring-inset"
        style={{ backgroundColor: hex }}
      />
      {swatchOnly ? <span className="sr-only">{name}</span> : name}
    </span>
  );
}
