import { ChevronRight, Flag } from "lucide-react";
import { getNextRace } from "@/lib/data/races";
import { raceTitle } from "@/lib/races";
import { ButtonLink, Card, CardBody, CardFooter, CardHeader, CardTitle, EmptyState } from "@/components/ui";
import { RaceStatusBadge } from "@/components/domain/RaceStatusBadge";
import { RaceCountdown } from "./RaceCountdown";
import { RaceMeta } from "./RaceMeta";
import { RaceSignupPanel } from "./RaceSignupPanel";

/** Home page card for the upcoming race. Reads DB + session: render inside <Suspense>. */
export async function NextRaceCard() {
  const race = await getNextRace();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Próxima carrera</CardTitle>
        {race && <RaceStatusBadge race={race} />}
      </CardHeader>
      {race ? (
        <>
          <CardBody className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-3xl">{raceTitle(race)}</h3>
              <RaceMeta race={race} className="text-fg-muted" />
            </div>
            <RaceCountdown target={race.scheduledAt.toISOString()} />
            <RaceSignupPanel race={race} />
          </CardBody>
          <CardFooter>
            <ButtonLink href={`/carreras/${race.id}`} variant="secondary" size="sm">
              Ver parrilla <ChevronRight />
            </ButtonLink>
          </CardFooter>
        </>
      ) : (
        <CardBody>
          <EmptyState
            icon={<Flag />}
            title="No hay carreras programadas"
            description="Cuando se programe una carrera aparecerá aquí con el botón de inscripción."
          />
        </CardBody>
      )}
    </Card>
  );
}
