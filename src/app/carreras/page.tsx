import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { Container, EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Carreras" };

export default function RacesPage() {
  return (
    <Container>
      <PageHeader title="Carreras" description="Calendario de la temporada, inscripciones y resultados." />
      <EmptyState icon={<CalendarDays />} title="Todavía no hay nada" />
    </Container>
  );
}
