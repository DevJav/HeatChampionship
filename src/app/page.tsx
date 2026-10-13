import { Suspense } from "react";
import { siteConfig } from "@/config/site";
import { Container, Skeleton } from "@/components/ui";
import { LastRaceCard } from "@/components/races/LastRaceCard";
import { NextRaceCard } from "@/components/races/NextRaceCard";
import { HomeStandings } from "@/components/standings/HomeStandings";
import { SeasonStrip } from "@/components/standings/SeasonStrip";

export default function HomePage() {
  return (
    <Container className="flex flex-col gap-6">
      <h1 className="sr-only">{siteConfig.name}</h1>
      <Suspense fallback={<Skeleton className="h-14 w-full" />}>
        <SeasonStrip />
      </Suspense>

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
