import { ChevronRight } from "lucide-react";
import { getLastFinishedRace } from "@/lib/data/races";
import { getRaceResults } from "@/lib/data/results";
import { formatDate } from "@/lib/format";
import { raceTitle } from "@/lib/races";
import { ButtonLink, Card, CardBody, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui";
import { Podium } from "./Podium";

/** Podium of the latest finished race; nothing before the first race. Reads the DB: render inside <Suspense>. */
export async function LastRaceCard() {
  const race = await getLastFinishedRace();
  if (!race) return null;
  const results = await getRaceResults(race.id);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Última carrera · {raceTitle(race)}</CardTitle>
          <CardDescription>
            {race.season.name} · {formatDate(race.scheduledAt)}
          </CardDescription>
        </div>
      </CardHeader>
      <CardBody className="pt-6">
        <Podium results={results} />
      </CardBody>
      <CardFooter>
        <ButtonLink href={`/carreras/${race.id}`} variant="secondary" size="sm">
          Ver resultados <ChevronRight />
        </ButtonLink>
      </CardFooter>
    </Card>
  );
}
