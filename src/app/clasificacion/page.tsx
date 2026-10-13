import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { Container, EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Clasificación" };

export default function StandingsPage() {
  return (
    <Container>
      <PageHeader title="Clasificación" description="Puntos de la temporada, desglose por ronda y evolución." />
      <EmptyState icon={<Trophy />} title="Todavía no hay nada" />
    </Container>
  );
}
