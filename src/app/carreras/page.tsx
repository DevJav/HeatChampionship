import type { Metadata } from "next";
import { Suspense } from "react";
import { CalendarDays } from "lucide-react";
import { Container, EmptyState, PageHeader, Section, Skeleton, Tabs } from "@/components/ui";
import { RaceCalendar } from "@/components/races/RaceCalendar";
import { RaceRow } from "@/components/races/RaceRow";
import { listPublishedRaces, type RaceListItem } from "@/lib/data/races";
import { toLocalInput } from "@/lib/dates";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.races.title };

/** Races grouped by season, keeping their order. */
function bySeason(races: RaceListItem[]) {
  const groups = new Map<string, { name: string; races: RaceListItem[] }>();
  for (const race of races) {
    const group = groups.get(race.season.id) ?? { name: race.season.name, races: [] };
    group.races.push(race);
    groups.set(race.season.id, group);
  }
  return [...groups.entries()];
}

async function RaceList() {
  const races = await listPublishedRaces();
  const upcoming = races.filter((race) => race.status !== "FINISHED");
  const finished = races.filter((race) => race.status === "FINISHED").reverse();

  if (races.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays />}
        title={t.races.noneScheduled}
        description={t.races.noneScheduledDescription}
      />
    );
  }

  return (
    <Tabs
      items={[
        { id: "lista", label: t.races.list, content: <RaceSections upcoming={upcoming} finished={finished} /> },
        {
          id: "calendario",
          label: t.races.calendar,
          content: <RaceCalendar races={races} today={toLocalInput(new Date()).slice(0, 10)} />,
        },
      ]}
    />
  );
}

function RaceSections({ upcoming, finished }: { upcoming: RaceListItem[]; finished: RaceListItem[] }) {
  return (
    <div className="flex flex-col gap-10">
      {upcoming.length > 0 && (
        <Section title={t.races.upcoming}>
          <ol className="flex flex-col gap-3">
            {upcoming.map((race) => (
              <RaceRow key={race.id} race={race} />
            ))}
          </ol>
        </Section>
      )}
      {finished.length > 0 && (
        <Section title={t.races.finished}>
          {bySeason(finished).map(([seasonId, season]) => (
            <div key={seasonId} className="flex flex-col gap-3">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-fg-muted not-italic">
                {season.name}
              </h3>
              <ol className="flex flex-col gap-3">
                {season.races.map((race) => (
                  <RaceRow key={race.id} race={race} />
                ))}
              </ol>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

export default function RacesPage() {
  return (
    <Container>
      <PageHeader title={t.races.title} description={t.races.description} />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <RaceList />
      </Suspense>
    </Container>
  );
}
