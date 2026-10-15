import type { Metadata } from "next";
import { Suspense } from "react";
import { Users } from "lucide-react";
import { intlLocale, t } from "@/i18n";
import { Container, EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { PlayerCard } from "@/components/players/PlayerCard";
import { getAchievements } from "@/lib/data/achievements";
import { listPlayers, toPlayerResults } from "@/lib/data/players";

export const metadata: Metadata = { title: t.drivers.title };

async function PlayerGrid() {
  const [players, { unlocks }] = await Promise.all([listPlayers(), getAchievements()]);
  if (players.length === 0) return <EmptyState icon={<Users />} title={t.drivers.empty} />;

  // Most career points first, then alphabetical
  const withPoints = players
    .map((player) => ({ player, results: toPlayerResults(player.results) }))
    .map((entry) => ({ ...entry, points: entry.results.reduce((sum, r) => sum + r.points, 0) }))
    .sort((a, b) => b.points - a.points || a.player.name.localeCompare(b.player.name, intlLocale));

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {withPoints.map(({ player, results }) => (
        <PlayerCard
          key={player.id}
          player={player}
          results={results}
          unlocks={unlocks.filter((u) => u.userId === player.id)}
        />
      ))}
    </div>
  );
}

export default function PlayersPage() {
  return (
    <Container>
      <PageHeader title={t.drivers.title} description={t.drivers.description} />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <PlayerGrid />
      </Suspense>
    </Container>
  );
}
