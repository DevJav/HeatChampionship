import { ChevronRight } from "lucide-react";
import type { Embed } from "@/lib/articles";
import { getAchievements } from "@/lib/data/achievements";
import { getCurrentSeason, getSeason } from "@/lib/data/catalog";
import { getPlayerProfile, toPlayerResults } from "@/lib/data/players";
import { getRace, type RaceDetail } from "@/lib/data/races";
import { getRaceResults } from "@/lib/data/results";
import { getSeasonStandings } from "@/lib/data/standings";
import { raceTitle } from "@/lib/races";
import { racePhase } from "@/lib/registration-rules";
import {
  Alert,
  Badge,
  ButtonLink,
  Card,
  CardBody,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  SpeedStripes,
} from "@/components/ui";
import { FlagBackdrop } from "@/components/domain/CountryFlag";
import { DriverName } from "@/components/domain/DriverName";
import { PositionBadge } from "@/components/domain/PositionBadge";
import { RaceStatusBadge } from "@/components/domain/RaceStatusBadge";
import { PlayerCard } from "@/components/players/PlayerCard";
import { Podium } from "@/components/races/Podium";
import { RaceCountdown } from "@/components/races/RaceCountdown";
import { RaceMeta } from "@/components/races/RaceMeta";
import { RaceSignupPanel } from "@/components/races/RaceSignupPanel";
import { ResultsTable } from "@/components/races/ResultsTable";
import { StandingsTable } from "@/components/standings/StandingsTable";
import { t } from "@/i18n";

type EmbedProps = { embed: Embed; preview: boolean };

/**
 * Readers never see broken embeds: they render nothing. In the editor preview
 * they show what's wrong so it can be fixed before publishing.
 */
function Unavailable({ embed, preview, reason }: EmbedProps & { reason: string }) {
  if (!preview) return null;
  return (
    <Alert tone="warning">
      {reason} <code className="text-xs opacity-70">{embed.source}</code>
    </Alert>
  );
}

const RACE_MISSING = t.articles.embeds.raceMissing;
const NO_RESULTS = t.articles.embeds.noResults;

function SeeMore({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <CardFooter>
      <ButtonLink href={href} variant="secondary" size="sm">
        {children} <ChevronRight />
      </ButtonLink>
    </CardFooter>
  );
}

// ---------------------------------------------------------------------------
// Race card
// ---------------------------------------------------------------------------

async function RaceWinners({ race }: { race: RaceDetail }) {
  const podium = (await getRaceResults(race.id)).filter((r) => r.position <= 3);
  if (podium.length === 0) return <p className="text-sm text-fg-muted">{t.articles.embeds.awaitingResults}</p>;
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-2">
      {podium.map((result) => (
        <li key={result.id} className="flex items-center gap-2">
          <PositionBadge position={result.position} size="sm" />
          <DriverName
            name={result.user.name}
            username={result.user.username}
            color={result.carColor?.hex ?? result.user.favoriteColor?.hex}
          />
        </li>
      ))}
    </ul>
  );
}

/** Broadcast-style race card: countdown and sign-up before the race, podium after. */
async function RaceCardEmbed(props: EmbedProps) {
  const race = props.embed.ref ? await getRace(props.embed.ref) : null;
  if (!race) return <Unavailable {...props} reason={RACE_MISSING} />;
  const phase = racePhase(race);
  const upcoming = phase === "UPCOMING" || phase === "OPEN" || phase === "CLOSED";

  return (
    <Card>
      <div className="relative overflow-hidden border-l-4 border-primary surface-bar">
        {race.track.countryCode ? (
          <FlagBackdrop code={race.track.countryCode} className="absolute inset-y-0 right-0 w-2/3 opacity-50" />
        ) : (
          <SpeedStripes className="absolute inset-y-0 right-0 w-1/2 opacity-80" />
        )}
        <div className="relative flex flex-col items-start gap-2 px-5 py-5">
          <div className="flex flex-wrap gap-2">
            <Badge tone="primary">{t.common.round(race.round)}</Badge>
            <Badge tone="bar">{race.season.name}</Badge>
            <RaceStatusBadge race={race} />
          </div>
          <span className="font-display text-4xl leading-none font-bold uppercase italic [text-shadow:0_2px_12px_rgb(0_0_0/0.5)]">
            {race.track.name}
          </span>
          <RaceMeta race={race} className="text-bar-fg/80" />
        </div>
      </div>
      <CardBody className="flex flex-col gap-4">
        {upcoming && !race.dateTbd && <RaceCountdown target={race.scheduledAt.toISOString()} />}
        {race.status === "FINISHED" ? <RaceWinners race={race} /> : <RaceSignupPanel race={race} />}
      </CardBody>
      <SeeMore href={`/carreras/${race.id}`}>{race.status === "FINISHED" ? t.races.viewResults : t.races.viewGrid}</SeeMore>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Results, podium and standings
// ---------------------------------------------------------------------------

async function finishedRace(props: EmbedProps) {
  const race = props.embed.ref ? await getRace(props.embed.ref) : null;
  if (!race) return { error: <Unavailable {...props} reason={RACE_MISSING} /> };
  if (race.status !== "FINISHED") return { error: <Unavailable {...props} reason={NO_RESULTS} /> };
  return { race };
}

async function ResultsEmbed(props: EmbedProps) {
  const { race, error } = await finishedRace(props);
  if (!race) return error;
  const results = await getRaceResults(race.id);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t.articles.embeds.results(raceTitle(race))}</CardTitle>
          <CardDescription>{race.season.name}</CardDescription>
        </div>
      </CardHeader>
      <ResultsTable results={results} />
      <SeeMore href={`/carreras/${race.id}`}>{t.articles.embeds.viewRace}</SeeMore>
    </Card>
  );
}

async function PodiumEmbed(props: EmbedProps) {
  const { race, error } = await finishedRace(props);
  if (!race) return error;
  const results = await getRaceResults(race.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.articles.embeds.podium(raceTitle(race))}</CardTitle>
      </CardHeader>
      <CardBody className="pt-8">
        <Podium results={results} />
      </CardBody>
    </Card>
  );
}

async function StandingsAfterRaceEmbed(props: EmbedProps) {
  const { race, error } = await finishedRace(props);
  if (!race) return error;
  const standings = await getSeasonStandings(race.seasonId, { throughRound: race.round });

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t.articles.embeds.standingsAfter(race.round)}</CardTitle>
          <CardDescription>{race.season.name}</CardDescription>
        </div>
      </CardHeader>
      <StandingsTable standings={standings} />
      <SeeMore href={`/clasificacion?temporada=${race.seasonId}`}>{t.articles.embeds.currentStandings}</SeeMore>
    </Card>
  );
}

async function StandingsEmbed(props: EmbedProps) {
  const season = props.embed.ref ? await getSeason(props.embed.ref) : await getCurrentSeason();
  if (!season) return <Unavailable {...props} reason={t.articles.embeds.seasonMissing} />;
  const standings = await getSeasonStandings(season.id);
  if (standings.rows.length === 0) {
    return <Unavailable {...props} reason={t.articles.embeds.seasonNoResults} />;
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t.standings.title}</CardTitle>
          <CardDescription>{season.name}</CardDescription>
        </div>
      </CardHeader>
      <StandingsTable standings={standings} />
      <SeeMore href={`/clasificacion?temporada=${season.id}`}>{t.standings.fullStandings}</SeeMore>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Driver
// ---------------------------------------------------------------------------

async function PlayerEmbed(props: EmbedProps) {
  const username = props.embed.ref?.toLowerCase();
  const [player, { unlocks }] = await Promise.all([
    username ? getPlayerProfile(username) : null,
    getAchievements(),
  ]);
  if (!player) return <Unavailable {...props} reason={t.articles.embeds.driverMissing} />;

  return (
    <div className="max-w-sm">
      <PlayerCard
        player={player}
        results={toPlayerResults(player.results)}
        unlocks={unlocks.filter((u) => u.userId === player.id)}
      />
    </div>
  );
}

/** A live block inside an article (see src/lib/articles.ts). Reads the DB and session: render inside <Suspense>. */
export function ArticleEmbed(props: EmbedProps) {
  switch (props.embed.kind) {
    case "carrera":
      return <RaceCardEmbed {...props} />;
    case "resultados":
      return <ResultsEmbed {...props} />;
    case "podio":
      return <PodiumEmbed {...props} />;
    case "clasificacion-tras":
      return <StandingsAfterRaceEmbed {...props} />;
    case "clasificacion":
      return <StandingsEmbed {...props} />;
    case "piloto":
      return <PlayerEmbed {...props} />;
  }
}
