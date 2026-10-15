import { ChevronRight, Trophy } from "lucide-react";
import { getCurrentSeason } from "@/lib/data/catalog";
import { getSeasonStandings } from "@/lib/data/standings";
import { t } from "@/i18n";
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
          <CardTitle>{t.standings.title}</CardTitle>
          {season && <CardDescription>{season.name}</CardDescription>}
        </div>
      </CardHeader>
      {standings && standings.rows.length > 0 ? (
        <>
          <StandingsTable standings={standings} limit={5} compact />
          <CardFooter>
            <ButtonLink href="/clasificacion" variant="secondary" size="sm">
              {t.standings.fullStandings} <ChevronRight />
            </ButtonLink>
          </CardFooter>
        </>
      ) : (
        <CardBody>
          <EmptyState
            icon={<Trophy />}
            title={t.standings.noResults}
            description={t.standings.homeNoResultsDescription}
          />
        </CardBody>
      )}
    </Card>
  );
}
