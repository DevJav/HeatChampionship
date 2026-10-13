import { ChevronRight } from "lucide-react";
import type { RaceSummary } from "@/lib/data/races";
import { raceTitle } from "@/lib/races";
import { ButtonLink, Card, CardBody, CardFooter, CardHeader, CardTitle } from "@/components/ui";
import { RaceStatusBadge } from "@/components/domain/RaceStatusBadge";
import { SeatsMeter } from "@/components/domain/SeatsMeter";
import { RaceMeta } from "./RaceMeta";

/** Summary card used in race lists. */
export function RaceCard({ race }: { race: RaceSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{raceTitle(race)}</CardTitle>
        <RaceStatusBadge race={race} />
      </CardHeader>
      <CardBody className="flex flex-col gap-3">
        <RaceMeta race={race} className="text-fg-muted" />
        {race.status !== "FINISHED" && (
          <SeatsMeter taken={race._count.registrations} max={race.maxPlayers} />
        )}
      </CardBody>
      <CardFooter>
        <ButtonLink href={`/carreras/${race.id}`} variant="secondary" size="sm">
          Ver carrera <ChevronRight />
        </ButtonLink>
      </CardFooter>
    </Card>
  );
}
