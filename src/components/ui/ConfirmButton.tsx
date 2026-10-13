"use client";

import { useState } from "react";
import { Button, type ButtonVariantProps } from "./Button";
import { Modal } from "./Modal";
import { SubmitButton } from "./SubmitButton";

type ConfirmButtonProps = ButtonVariantProps & {
  /** Dialog title, e.g. "¿Eliminar carrera?" */
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  className?: string;
  /** Trigger button content */
  children: React.ReactNode;
};

/**
 * Place inside a <form>: the trigger opens a confirmation dialog whose
 * confirm button submits the surrounding form.
 */
export function ConfirmButton({
  title,
  description,
  confirmLabel = "Confirmar",
  variant = "danger",
  size,
  className,
  children,
}: ConfirmButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        description={description}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <SubmitButton variant={variant === "danger" ? "danger" : "primary"}>
              {confirmLabel}
            </SubmitButton>
          </>
        }
      />
    </>
  );
}
