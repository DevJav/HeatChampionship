"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { Home, RotateCcw } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui";
import { StatusPage } from "@/components/layout/StatusPage";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      code="!"
      title="Bandera roja"
      description="Algo ha fallado y la carrera está neutralizada. Prueba otra vez; si sigue pasando, avisa al organizador."
      actions={
        <>
          <Button variant="accent" onClick={() => retry()}>
            <RotateCcw /> Reintentar
          </Button>
          <ButtonLink href="/" variant="inverse">
            <Home /> Volver al inicio
          </ButtonLink>
        </>
      }
      footnote={error.digest && `Referencia: ${error.digest}`}
    />
  );
}
