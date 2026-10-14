import type { SeasonStandings } from "@/lib/data/standings";
import { PointsChart, type ChartSeries } from "./PointsChart";

/** Adapts season standings to the points-progression chart (top three highlighted). */
export function StandingsChart({ standings }: { standings: SeasonStandings }) {
  const { races, rows, drivers, progression } = standings;
  const rounds = races.map((race) => ({ label: `R${race.round}`, title: `Ronda ${race.round} · ${race.track.name}` }));
  const series: ChartSeries[] = rows.map((row, index) => ({
    id: row.userId,
    name: drivers.get(row.userId)?.name ?? "—",
    username: drivers.get(row.userId)?.username ?? null,
    values: progression.map((step) => step.totals[row.userId] ?? 0),
    slot: index < 3 ? ((index + 1) as 1 | 2 | 3) : null,
  }));
  return <PointsChart rounds={rounds} series={series} />;
}
