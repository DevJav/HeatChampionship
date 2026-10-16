import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/ui";
import { Recorder } from "./Recorder";

export const metadata: Metadata = { title: "Demo de anotación" };

/**
 * The race recorder on the USA track with made-up drivers, for trying it out
 * without a race. Nothing is saved to the database; the session lives in this
 * browser. The real one is at /carreras/[id]/anotar.
 */
export default function RaceLogDemoPage() {
  return (
    <Container className="flex flex-col gap-6">
      <PageHeader
        className="max-lg:hidden"
        eyebrow="Demo"
        title="Anotar carrera"
        description="Al final de cada ronda, toca dónde ha terminado cada coche, en el orden que te pide. Estados Unidos, pilotos de prueba."
      />
      <Recorder />
    </Container>
  );
}
