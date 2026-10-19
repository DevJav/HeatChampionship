import { Sparkles } from "lucide-react";
import type { RaceDetail } from "@/lib/data/races";
import { getRacePredictions } from "@/lib/data/predictions";
import { podiumOf, predictionsClosed, predictionsOpen, scorePicks } from "@/lib/predictions";
import { getCurrentUser } from "@/lib/session";
import { ButtonLink, Card, CardBody, CardHeader, CardTitle, Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { DriverName } from "@/components/domain/DriverName";
import { PredictionForm } from "./PredictionForm";
import { t } from "@/i18n";

type Result = { userId: string; position: number };

/**
 * Podium predictions for a race: everyone's picks, a button to make or change
 * yours while they're open, and the points once the race is finished.
 * Reads the session: render inside <Suspense>.
 */
export async function RacePredictions({ race, results = [] }: { race: RaceDetail; results?: Result[] }) {
  const now = new Date();
  const open = predictionsOpen(race, now);
  if (!open && !predictionsClosed(race, now)) return null;

  const [predictions, user] = await Promise.all([getRacePredictions(race.id), getCurrentUser()]);
  const finished = race.status === "FINISHED";
  if (!open && predictions.length === 0 && finished) return null;

  const drivers = race.registrations.filter((r) => r.status === "CONFIRMED").map((r) => r.user);
  const mine = user && predictions.find((p) => p.user.id === user.id);
  const podium = podiumOf(results);
  const rows = predictions
    .map((p) => ({ ...p, score: finished ? scorePicks(p.picks, podium) : null }))
    .sort((a, b) => (b.score?.points ?? 0) - (a.score?.points ?? 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.predictions.title}</CardTitle>
      </CardHeader>
      {open && (
        <CardBody className="flex flex-col gap-3">
          <p className="text-sm text-fg-muted">
            {t.predictions.intro} {t.predictions.count(predictions.length)}
          </p>
          {drivers.length < 3 ? (
            <p className="text-sm">{t.predictions.needDrivers}</p>
          ) : user ? (
            <PredictionForm raceId={race.id} drivers={drivers.map((d) => ({ id: d.id, name: d.name }))} current={mine?.picks ?? null} />
          ) : (
            <ButtonLink href={`/entrar?volver=/carreras/${race.id}`} size="sm" className="self-start">
              {t.predictions.logIn}
            </ButtonLink>
          )}
        </CardBody>
      )}
      {rows.length > 0 ? (
        <Table>
          <THead>
            <tr>
              <Th>{t.predictions.predictor}</Th>
              {t.predictions.places.map((place) => (
                <Th key={place}>{place}</Th>
              ))}
              {finished && <Th align="right">{t.predictions.points}</Th>}
            </tr>
          </THead>
          <TBody>
            {rows.map(({ user: who, picks, names, score }) => (
              <Tr key={who.id}>
                <Td>
                  <DriverName name={who.name} username={who.username} color={who.favoriteColor?.hex} />
                </Td>
                {names.map((name, i) => (
                  <Td key={i} className={finished && podium[i] === picks[i] ? "font-bold text-success" : undefined}>
                    {name}
                  </Td>
                ))}
                {score && (
                  <Td align="right" className="font-bold tabular-nums">
                    {score.perfect && <Sparkles aria-label={t.predictions.perfect} className="mr-1 inline size-4 text-accent" />}
                    {score.points}
                  </Td>
                )}
              </Tr>
            ))}
          </TBody>
        </Table>
      ) : (
        !open && (
          <CardBody>
            <p className="text-sm text-fg-muted">{t.predictions.none}</p>
          </CardBody>
        )
      )}
    </Card>
  );
}
