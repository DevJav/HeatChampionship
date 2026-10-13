import type { Metadata } from "next";
import { ChartColumn } from "lucide-react";
import { Container, EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Estadísticas" };

export default function StatsPage() {
  return (
    <Container>
      <PageHeader title="Estadísticas" description="Récords, cara a cara y estadísticas de mejoras." />
      <EmptyState icon={<ChartColumn />} title="Todavía no hay nada" />
    </Container>
  );
}
