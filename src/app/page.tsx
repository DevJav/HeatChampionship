import { Suspense } from "react";
import { siteConfig } from "@/config/site";
import { Container, Skeleton } from "@/components/ui";
import { RecentActivity } from "@/components/activity/RecentActivity";
import { LatestNews } from "@/components/articles/LatestNews";
import { DatePollBanner } from "@/components/date-poll/DatePollBanner";
import { LastRaceCard } from "@/components/races/LastRaceCard";
import { NextRaceCard } from "@/components/races/NextRaceCard";
import { HomeStandings } from "@/components/standings/HomeStandings";
import { SeasonStrip } from "@/components/standings/SeasonStrip";

export default function HomePage() {
  return (
    // News and activity sit beside everything on wide screens and below it on smaller ones.
    // With neither the sidebar is empty and the main column takes the full width.
    <Container className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:has-[>aside:empty]:grid-cols-1">
      <h1 className="sr-only">{siteConfig.name}</h1>
      <div className="flex min-w-0 flex-col gap-6">
        <Suspense fallback={<Skeleton className="h-14 w-full" />}>
          <SeasonStrip />
        </Suspense>
        <Suspense>
          <DatePollBanner />
        </Suspense>

        {/* Side by side, except when the news column leaves too little room */}
        <div className="grid items-start gap-6 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
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
      </div>

      <aside className="flex flex-col gap-6">
        <Suspense>
          <LatestNews />
        </Suspense>
        <Suspense>
          <RecentActivity />
        </Suspense>
      </aside>
    </Container>
  );
}
