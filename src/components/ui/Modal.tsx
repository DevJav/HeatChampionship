"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
};

/** Built on the native <dialog>: focus trapping, Esc and backdrop for free. */
export function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  className,
  children,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // Clicking the backdrop (the dialog element itself) closes it
        if (e.target === e.currentTarget) onClose();
      }}
      // The dialog carries the shadow; the inner panel is clipped (clip-path would cut the shadow)
      className={cn(
        "m-auto w-[calc(100%-2rem)] max-w-lg bg-transparent p-0 text-fg drop-shadow-[var(--overlay-shadow)] backdrop:bg-black/70",
        className,
      )}
    >
      <div className="surface-panel clip-chamfer">
        <div className="flex items-center justify-between gap-4 border-l-4 border-primary surface-bar px-5 py-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl">{title}</h2>
            {description && <p className="text-sm opacity-70">{description}</p>}
          </div>
          <Button variant="inverse" size="icon" onClick={onClose} aria-label="Cerrar">
            <X />
          </Button>
        </div>
        {children && <div className="px-5 py-4">{children}</div>}
        {footer && (
          <div className="flex justify-end gap-2 border-t border-border bg-surface-2/50 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}
