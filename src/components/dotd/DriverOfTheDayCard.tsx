import { Award } from "lucide-react";
import type { RaceDetail } from "@/lib/data/races";
import type { RaceResultDetail } from "@/lib/data/results";
import { getDotdVotes } from "@/lib/data/driver-of-the-day";
import { tallyVotes, votingClosesAt, votingPhase } from "@/lib/driver-of-the-day";
import { formatDateTime } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui";
import { DriverName } from "@/components/domain/DriverName";
import { DotdVoteForm } from "./DotdVoteForm";
import { t } from "@/i18n";

/** Vote while it's open (drivers of the race only); the winner once it closes. Reads the session. */
export async function DriverOfTheDayCard({ race, results }: { race: RaceDetail; results: RaceResultDetail[] }) {
  const phase = votingPhase(race, new Date());
  if (phase === "not-started" || results.length < 2) return null;
  const [votes, user] = await Promise.all([getDotdVotes(race.id), getCurrentUser()]);
  const drivers = results.map((r) => r.user);
  const color = (r: RaceResultDetail) => r.carColor?.hex ?? r.user.favoriteColor?.hex ?? null;

  let body: React.ReactNode;
  if (phase === "closed") {
    const { winners, most } = tallyVotes(votes);
    body = winners.length ? (
      <ul className="flex flex-col gap-2">
        {results
          .filter((r) => winners.includes(r.user.id))
          .map((r) => (
            <li key={r.user.id} className="flex items-center gap-3">
              <Award aria-hidden className="size-6 shrink-0 text-accent" />
              <DriverName name={r.user.name} username={r.user.username} color={color(r)} />
              <span className="text-sm text-fg-muted">{t.dotd.winner(most)}</span>
            </li>
          ))}
      </ul>
    ) : (
      <p className="text-sm text-fg-muted">{t.dotd.noVotes}</p>
    );
  } else {
    const mine = user && votes.find((v) => v.voterId === user.id);
    const racing = user && drivers.some((d) => d.id === user.id);
    body = (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-fg-muted">
          {t.dotd.intro} {t.dotd.closesOn(formatDateTime(votingClosesAt(race)!))} {t.dotd.turnout(votes.length, drivers.length)}
        </p>
        {racing ? (
          <>
            {mine && <p className="text-sm font-semibold">{t.dotd.yourVote(drivers.find((d) => d.id === mine.driverId)?.name ?? "?")}</p>}
            <DotdVoteForm
              raceId={race.id}
              current={mine?.driverId ?? null}
              candidates={results
                .filter((r) => r.user.id !== user.id)
                .map((r) => ({ id: r.user.id, name: r.user.name, color: color(r), position: r.position }))}
            />
          </>
        ) : (
          <p className="text-sm">{user ? t.dotd.onlyDrivers : t.dotd.logInToVote}</p>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.dotd.title}</CardTitle>
      </CardHeader>
      <CardBody>{body}</CardBody>
    </Card>
  );
}
