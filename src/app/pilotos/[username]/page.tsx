import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Award, Flag, Gauge, MapPin, Pencil, Trophy, TrendingUp, Medal } from "lucide-react";
import {
  Avatar,
  Badge,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ChequeredStrip,
  Container,
  Skeleton,
  SpeedStripes,
  StatCard,
} from "@/components/ui";
import { CarColorChip } from "@/components/domain/CarColorChip";
import { FormStrip } from "@/components/players/FormStrip";
import { RaceHistory } from "@/components/players/RaceHistory";
import { AchievementBadge } from "@/components/achievements/AchievementBadge";
import { TrophyChips } from "@/components/achievements/TrophyChips";
import { awardsFor } from "@/lib/achievements";
import { getAchievements } from "@/lib/data/achievements";
import { getCurrentSeason } from "@/lib/data/catalog";
import { getPlayerProfile, toPlayerResults } from "@/lib/data/players";
import { getSeasonStandings } from "@/lib/data/standings";
import { formatDecimal, formatSigned } from "@/lib/format";
import { summarizePlayer } from "@/lib/player-stats";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Piloto" };

async function ProfileView({ params }: { params: PageProps<"/pilotos/[username]">["params"] }) {
  const { username } = await params;
  const [player, viewer, season, { unlocks }] = await Promise.all([
    getPlayerProfile(decodeURIComponent(username)),
    getCurrentUser(),
    getCurrentSeason(),
    getAchievements(),
  ]);
  if (!player) notFound();
  const awards = awardsFor(player.id, unlocks);
  const badges = awards.filter((a) => !a.achievement.trophy);
  const earned = badges.filter((a) => a.unlocks.length > 0);
  const locked = badges.filter((a) => a.unlocks.length === 0);
  const earnedBadges = earned.length;

  const summary = summarizePlayer(toPlayerResults(player.results));
  const standings = season ? await getSeasonStandings(season.id) : null;
  const seasonRow = standings?.rows.find((row) => row.userId === player.id);
  const isMe = viewer?.id === player.id;

  return (
    <div className="flex flex-col gap-8">
      <section className="relative overflow-hidden border-l-4 border-primary surface-bar clip-chamfer">
        <SpeedStripes className="absolute inset-y-0 right-0 w-1/2 opacity-80" />
        <div className="relative flex flex-col gap-5 px-6 py-8 sm:flex-row sm:items-center sm:px-10">
          <Avatar name={player.name} src={player.image} color={player.favoriteColor?.hex} size="xl" />
          <div className="flex min-w-0 flex-col items-start gap-2">
            <div className="flex flex-wrap gap-2">
              {seasonRow && season && (
                <Badge tone="primary">
                  {seasonRow.rank}º en {season.name}
                </Badge>
              )}
              <Badge tone="bar">@{player.username}</Badge>
            </div>
            <h1 className="pr-2 text-5xl sm:text-6xl">{player.name}</h1>
            <TrophyChips unlocks={awards.flatMap((a) => a.unlocks)} />
            {player.bio && <p className="max-w-xl text-bar-fg/80">{player.bio}</p>}
            <div className="flex flex-wrap items-center gap-4 text-sm text-bar-fg/80">
              {player.favoriteColor && (
                <span className="flex items-center gap-2">
                  Coche favorito: <CarColorChip name={player.favoriteColor.name} hex={player.favoriteColor.hex} />
                </span>
              )}
              {isMe && (
                <ButtonLink href="/perfil" variant="inverse" size="sm">
                  <Pencil /> Editar perfil
                </ButtonLink>
              )}
            </div>
          </div>
        </div>
        <ChequeredStrip className="relative text-bar-fg/80" />
      </section>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Carreras" value={summary.starts} icon={<Flag />} hint={summary.dnfs ? `${summary.dnfs} retiradas` : undefined} />
        <StatCard label="Victorias" value={summary.wins} icon={<Trophy />} />
        <StatCard label="Podios" value={summary.podiums} icon={<Medal />} />
        <StatCard
          label="Puntos"
          value={summary.points}
          icon={<Award />}
          hint={seasonRow && season ? `${seasonRow.points} en ${season.name}` : undefined}
        />
        <StatCard
          label="Posición media"
          value={summary.averageFinish != null ? formatDecimal(summary.averageFinish) : "—"}
          icon={<Gauge />}
          hint={summary.bestFinish ? `Mejor: ${summary.bestFinish}º` : undefined}
        />
        <StatCard
          label="Remontada media"
          value={summary.averageGained != null ? formatSigned(summary.averageGained) : "—"}
          icon={<TrendingUp />}
          hint="Puestos ganados desde la salida"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Logros</CardTitle>
          <Badge tone="bar">
            {earnedBadges}/{badges.length}
          </Badge>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          {earnedBadges > 0 ? (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {earned.map((award) => (
                <AchievementBadge key={award.achievement.id} award={award} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-fg-muted">Todavía ninguno: el primero llega con la primera carrera.</p>
          )}
          {locked.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-sm font-semibold text-fg-muted hover:text-primary">
                Por conseguir ({locked.length})
              </summary>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {locked.map((award) => (
                  <AchievementBadge key={award.achievement.id} award={award} />
                ))}
              </ul>
            </details>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Forma</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-2">
            <FormStrip form={summary.form} />
            <p className="text-xs text-fg-subtle">Últimas 5 carreras, de la más reciente a la más antigua.</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Mejor circuito</CardTitle>
          </CardHeader>
          <CardBody>
            {summary.bestTrack ? (
              <p className="flex items-center gap-3">
                <MapPin className="size-5 text-primary" />
                <span className="font-display text-2xl font-bold uppercase italic">{summary.bestTrack.trackName}</span>
                <span className="text-sm text-fg-muted">
                  posición media {formatDecimal(summary.bestTrack.averageFinish)} en {summary.bestTrack.starts}{" "}
                  {summary.bestTrack.starts === 1 ? "carrera" : "carreras"}
                </span>
              </p>
            ) : (
              <span className="text-sm text-fg-subtle">Sin datos todavía</span>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <RaceHistory results={player.results} />
      </Card>
    </div>
  );
}

export default function PlayerPage({ params }: PageProps<"/pilotos/[username]">) {
  return (
    <Container>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ProfileView params={params} />
      </Suspense>
    </Container>
  );
}
