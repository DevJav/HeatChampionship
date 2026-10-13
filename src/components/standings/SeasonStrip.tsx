import Link from "next/link";
import { Crown } from "lucide-react";
import { cn } from "@/lib/cn";
import { getCurrentSeason } from "@/lib/data/catalog";
import { getSeasonStandings } from "@/lib/data/standings";
import { Badge, SpeedStripes } from "@/components/ui";
import { DriverName } from "@/components/domain/DriverName";

/**
 * Slim broadcast bar for the home page: current season, rounds raced and the
 * leader. Reads the DB: render inside <Suspense>. Renders nothing without a season.
 */
export async function SeasonStrip() {
  const season = await getCurrentSeason();
  if (!season) return null;
  const { races, rows, drivers, scheduledRaces } = await getSeasonStandings(season.id);
  const total = Math.max(scheduledRaces, races.length);
  const leader = rows[0] ? drivers.get(rows[0].userId) : null;
  const lead = rows[0] && rows[1] ? rows[0].points - rows[1].points : null;

  return (
    <section className="relative overflow-hidden border-l-4 border-primary surface-bar clip-chamfer">
      <SpeedStripes className="absolute inset-y-0 right-0 w-1/3 opacity-60" />
      <div className="relative flex flex-wrap items-center gap-x-5 gap-y-2.5 px-4 py-3 sm:gap-x-8 sm:px-5 sm:py-3.5">
        <Link href="/clasificacion" className="hover:opacity-90">
          <Badge tone="primary">{season.name}</Badge>
        </Link>

        {total > 0 && (
          <div className="flex items-center gap-3">
            <span className="font-display text-xs font-bold uppercase tracking-wider text-bar-fg/70">Ronda</span>
            <span className="font-display text-lg font-bold italic tabular-nums">
              {races.length}
              <span className="text-bar-fg/60">/{total}</span>
            </span>
            <span className="flex gap-1" aria-hidden>
              {Array.from({ length: total }, (_, i) => (
                <span key={i} className={cn("h-3.5 w-2.5 -skew-x-12", i < races.length ? "bg-primary" : "bg-bar-fg/20")} />
              ))}
            </span>
          </div>
        )}

        {leader && (
          <div className="flex items-center gap-3">
            <Crown aria-hidden className="size-4 text-accent" />
            <span className="font-display text-xs font-bold uppercase tracking-wider text-bar-fg/70">Líder</span>
            <DriverName name={leader.name} username={leader.username} color={leader.favoriteColor?.hex} />
            <span className="font-display text-lg font-bold italic whitespace-nowrap tabular-nums">
              {rows[0].points}
              <span className="text-sm font-normal not-italic text-bar-fg/70"> pts</span>
            </span>
            {lead != null && lead > 0 && <span className="text-xs whitespace-nowrap text-bar-fg/60 max-sm:hidden">+{lead} sobre el 2º</span>}
          </div>
        )}
      </div>
    </section>
  );
}
