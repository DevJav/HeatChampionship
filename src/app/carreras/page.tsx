import type { Metadata } from "next";
import { Suspense } from "react";
import { CalendarDays } from "lucide-react";
import { Container, EmptyState, PageHeader, Section, Skeleton } from "@/components/ui";
import { RaceCard } from "@/components/races/RaceCard";
import { listPublishedRaces } from "@/lib/data/races";

export const metadata: Metadata = { title: "Carreras" };

async function RaceList() {
  const races = await listPublishedRaces();
  const upcoming = races.filter((race) => race.status !== "FINISHED");
  const finished = races.filter((race) => race.status === "FINISHED").reverse();

  if (races.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays />}
        title="No hay carreras programadas"
        description="El organizador publicará aquí la próxima carrera."
      />
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {upcoming.length > 0 && (
        <Section title="Próximas">
          <div className="grid gap-6 md:grid-cols-2">
            {upcoming.map((race) => (
              <RaceCard key={race.id} race={race} />
            ))}
          </div>
        </Section>
      )}
      {finished.length > 0 && (
        <Section title="Disputadas">
          <div className="grid gap-6 md:grid-cols-2">
            {finished.map((race) => (
              <RaceCard key={race.id} race={race} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

export default function RacesPage() {
  return (
    <Container>
      <PageHeader title="Carreras" description="Calendario de la temporada, inscripciones y resultados." />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <RaceList />
      </Suspense>
    </Container>
  );
}
