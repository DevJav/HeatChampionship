import { Sparkles } from "lucide-react";
import type { RaceDetail } from "@/lib/data/races";
import { getRacePredictions } from "@/lib/data/predictions";
import { picksRevealed, podiumOf, predictionsOpen, scorePicks } from "@/lib/predictions";
import { getCurrentUser } from "@/lib/session";
import { ButtonLink, Card, CardBody, CardHeader, CardTitle, Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { DriverName } from "@/components/domain/DriverName";
import { PredictionForm } from "./PredictionForm";
import { t } from "@/i18n";

type Result = { userId: string; position: number };

/**
 * Podium predictions for a race: the form while they're open (picks private),
 * everyone's picks once the race starts, and their points once it's finished.
 * Reads the session: render inside <Suspense>.
 */
export async function RacePredictions({ race, results = [] }: { race: RaceDetail; results?: Result[] }) {
  const now = new Date();
  const open = predictionsOpen(race, now);
  const revealed = picksRevealed(race, now);
  if (!open && !revealed) return null;

  const [predictions, user] = await Promise.all([getRacePredictions(race.id), getCurrentUser()]);
  if (revealed && predictions.length === 0 && race.status === "FINISHED") return null;

  let body: React.ReactNode;
  if (open) {
    const drivers = race.registrations.filter((r) => r.status === "CONFIRMED").map((r) => r.user);
    const mine = user && predictions.find((p) => p.user.id === user.id);
    body = (
      <div className="flex flex-col gap-3">
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
      </div>
    );
  } else if (predictions.length === 0) {
    body = <p className="text-sm text-fg-muted">{t.predictions.none}</p>;
  } else {
    const finished = race.status === "FINISHED";
    const podium = podiumOf(results);
    const rows = predictions
      .map((p) => ({ ...p, score: finished ? scorePicks(p.picks, podium) : null }))
      .sort((a, b) => (b.score?.points ?? 0) - (a.score?.points ?? 0));
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.predictions.title}</CardTitle>
        </CardHeader>
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
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.predictions.title}</CardTitle>
      </CardHeader>
      <CardBody>{body}</CardBody>
    </Card>
  );
}
