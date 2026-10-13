import { Suspense } from "react";
import { CalendarDays, Trophy } from "lucide-react";
import { siteConfig } from "@/config/site";
import { Badge, ButtonLink, ChequeredStrip, Container, Skeleton, SpeedStripes } from "@/components/ui";
import { LastRaceCard } from "@/components/races/LastRaceCard";
import { NextRaceCard } from "@/components/races/NextRaceCard";
import { HomeStandings } from "@/components/standings/HomeStandings";

export default function HomePage() {
  return (
    <Container className="flex flex-col gap-10">
      <section className="relative overflow-hidden border-l-4 border-primary surface-bar clip-chamfer">
        <SpeedStripes className="absolute inset-y-0 right-0 w-2/3 opacity-90" />
        <div className="relative flex flex-col items-start gap-4 px-6 py-10 sm:px-10 sm:py-14">
          <Badge tone="primary">Liga mensual de carreras</Badge>
          <h1 className="text-6xl sm:text-8xl">{siteConfig.name}</h1>
          <p className="max-w-xl text-bar-fg/80">{siteConfig.description}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <ButtonLink href="/carreras" variant="accent" size="lg">
              <CalendarDays /> Próximas carreras
            </ButtonLink>
            <ButtonLink href="/clasificacion" variant="inverse" size="lg">
              <Trophy /> Clasificación
            </ButtonLink>
          </div>
        </div>
        <ChequeredStrip className="relative text-bar-fg/80" />
      </section>

      <div className="grid items-start gap-6 md:grid-cols-2">
        <Suspense fallback={<Skeleton className="h-72 w-full" />}>
          <NextRaceCard />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-72 w-full" />}>
          <HomeStandings />
        </Suspense>
      </div>

      <Suspense fallback={<Skeleton className="h-72 w-full" />}>
        <LastRaceCard />
      </Suspense>
    </Container>
  );
}
