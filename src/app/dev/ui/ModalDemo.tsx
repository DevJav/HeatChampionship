"use client";

import { useState } from "react";
import { Button, Field, Input, Modal } from "@/components/ui";

export function ModalDemo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Abrir modal
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Inscripción a la carrera"
        description="Ronda 3 · Italia · 14 nov"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setOpen(false)}>Confirmar</Button>
          </>
        }
      >
        <Field label="Color de coche preferido" htmlFor="demo-color">
          <Input id="demo-color" placeholder="Rojo" />
        </Field>
      </Modal>
    </>
  );
}
