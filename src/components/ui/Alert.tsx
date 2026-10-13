import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const alertVariants = cva(
  "flex items-start gap-3 border-l-4 px-4 py-3 text-sm [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        info: "border-info bg-info/10 text-fg",
        success: "border-success bg-success/10 text-fg",
        warning: "border-warning bg-warning/10 text-fg",
        danger: "border-danger bg-danger/10 text-fg",
      },
    },
    defaultVariants: { tone: "info" },
  },
);

type AlertProps = React.ComponentProps<"div"> &
  VariantProps<typeof alertVariants> & {
    icon?: React.ReactNode;
  };

export function Alert({ tone, icon, className, children, ...props }: AlertProps) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(alertVariants({ tone }), className)}
      {...props}
    >
      {icon}
      <div className="flex-1">{children}</div>
    </div>
  );
}
