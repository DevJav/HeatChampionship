import { cn } from "@/lib/cn";

/** Shared look for every text-like control (input, select, textarea). */
const controlClass =
  "w-full rounded-control border border-border border-b-2 border-b-border-strong bg-surface-2 px-3 text-sm text-fg placeholder:text-fg-subtle transition-colors focus:border-b-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-b-danger";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(controlClass, "h-10", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(controlClass, "min-h-24 py-2", className)}
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return <select className={cn(controlClass, "h-10 pr-8", className)} {...props} />;
}

type CheckboxProps = Omit<React.ComponentProps<"input">, "type"> & { label: React.ReactNode };

export function Checkbox({ label, className, id, ...props }: CheckboxProps) {
  return (
    <label htmlFor={id} className={cn("inline-flex cursor-pointer items-center gap-2 text-sm", className)}>
      <input id={id} type="checkbox" className="size-4 accent-primary" {...props} />
      {label}
    </label>
  );
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn(
        "font-display text-xs font-bold uppercase tracking-wider text-fg-muted",
        className,
      )}
      {...props}
    />
  );
}

type FieldProps = {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
};

/** Label + control + hint/error, with consistent spacing. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-fg-subtle">{hint}</p>
      ) : null}
    </div>
  );
}
