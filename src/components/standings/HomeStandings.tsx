import { ChevronRight, Trophy } from "lucide-react";
import { getCurrentSeason } from "@/lib/data/catalog";
import { getSeasonStandings } from "@/lib/data/standings";
import { ButtonLink, Card, CardBody, CardDescription, CardFooter, CardHeader, CardTitle, EmptyState } from "@/components/ui";
import { StandingsTable } from "./StandingsTable";

/** Top five of the current season. Reads the DB: render inside <Suspense>. */
export async function HomeStandings() {
  const season = await getCurrentSeason();
  const standings = season ? await getSeasonStandings(season.id) : null;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Clasificación</CardTitle>
          {season && <CardDescription>{season.name}</CardDescription>}
        </div>
      </CardHeader>
      {standings && standings.rows.length > 0 ? (
        <>
          <StandingsTable standings={standings} limit={5} compact />
          <CardFooter>
            <ButtonLink href="/clasificacion" variant="secondary" size="sm">
              Clasificación completa <ChevronRight />
            </ButtonLink>
          </CardFooter>
        </>
      ) : (
        <CardBody>
          <EmptyState
            icon={<Trophy />}
            title="Aún no hay resultados"
            description="La cabeza de la clasificación aparecerá tras la primera carrera."
          />
        </CardBody>
      )}
    </Card>
  );
}
