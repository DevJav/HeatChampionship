import type { Metadata } from "next";
import { Users } from "lucide-react";
import { Container, EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Pilotos" };

export default function DriversPage() {
  return (
    <Container>
      <PageHeader title="Pilotos" description="Perfiles, forma reciente e historial de carreras." />
      <EmptyState icon={<Users />} title="Todavía no hay nada" />
    </Container>
  );
}
