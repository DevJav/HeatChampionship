import type { Metadata } from "next";
import { CalendarDays, Home } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { StatusPage } from "@/components/layout/StatusPage";

export const metadata: Metadata = { title: "Página no encontrada" };

export default function NotFound() {
  return (
    <StatusPage
      code="404"
      title="Fuera de pista"
      description="Esta página no existe o se ha retirado de la carrera. Puede que el enlace esté mal o que la hayan borrado."
      actions={
        <>
          <ButtonLink href="/" variant="accent">
            <Home /> Volver al inicio
          </ButtonLink>
          <ButtonLink href="/carreras" variant="inverse">
            <CalendarDays /> Ver carreras
          </ButtonLink>
        </>
      }
    />
  );
}
