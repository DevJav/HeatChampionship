import { Award, Flag, Sparkles, Swords, TrendingUp, Trophy, Zap } from "lucide-react";
import { ACHIEVEMENT_BY_ID } from "@/lib/achievements";
import type { StatsDriver } from "@/lib/data/stats";
import { cn } from "@/lib/cn";
import { formatDecimal } from "@/lib/format";
import { raceTitle } from "@/lib/races";
import type { SeasonWrapped } from "@/lib/wrapped";
import { SpeedStripes } from "@/components/ui";
import Link from "next/link";
import { AchievementIcon } from "@/components/achievements/AchievementIcon";
import { tierClass } from "@/components/achievements/AchievementBadge";
import { t } from "@/i18n";

type SlideProps = { kicker: string; icon: React.ReactNode; tone?: "dark" | "red" | "light"; children: React.ReactNode };

/** One full-width "card" of the review: a small kicker over big type. */
function Slide({ kicker, icon, tone = "dark", children }: SlideProps) {
  return (
    <section
      className={cn(
        "relative flex min-h-72 flex-col justify-center gap-4 overflow-hidden px-6 py-10 clip-chamfer sm:px-10",
        tone === "dark" && "surface-bar",
        tone === "red" && "bg-primary text-primary-fg",
        tone === "light" && "border-l-4 border-primary bg-surface-2",
      )}
    >
      {tone !== "light" && <SpeedStripes className="absolute inset-y-0 right-0 w-1/3 opacity-40" />}
      <p className="relative flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest opacity-80 [&_svg]:size-4">
        {icon}
        {kicker}
      </p>
      <div className="relative flex flex-col gap-4">{children}</div>
    </section>
  );
}

/** A rival's name, big, with their colour stripe; links to their profile. */
function RivalName({ driver }: { driver: StatsDriver | undefined }) {
  const name = (
    <span className="flex items-center gap-3">
      <span aria-hidden className="h-8 w-2 shrink-0 -skew-x-12 ring-1 ring-white/40" style={{ background: driver?.favoriteColor?.hex ?? "var(--fg-subtle)" }} />
      <span className="font-display text-3xl font-bold uppercase italic">{driver?.name ?? "—"}</span>
    </span>
  );
  return driver?.username ? (
    <Link href={`/pilotos/${driver.username}`} className="hover:underline">
      {name}
    </Link>
  ) : (
    name
  );
}

function Big({ children }: { children: React.ReactNode }) {
  return <p className="font-display text-4xl leading-none font-bold uppercase italic sm:text-6xl">{children}</p>;
}

function Stat({ value, label, hint }: { value: React.ReactNode; label: string; hint?: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-display text-5xl leading-none font-bold italic tabular-nums sm:text-7xl">{value}</span>
      <span className="font-display text-sm font-bold uppercase tracking-wide opacity-80">{label}</span>
      {hint && <span className="text-xs opacity-70">{hint}</span>}
    </div>
  );
}

/** The season in review as a column of big cards, Wrapped style. */
export function WrappedSlides({ wrapped: w, drivers, finished }: { wrapped: SeasonWrapped; drivers: Map<string, StatsDriver>; finished: boolean }) {
  const ordinal = t.common.ordinal;
  const rival = (id: string) => drivers.get(id);

  return (
    <div className="flex flex-col gap-6">
      <Slide kicker={t.wrapped.numbers} icon={<Flag />} tone="red">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat value={w.races} label={t.wrapped.races} />
          <Stat value={w.wins} label={t.wrapped.wins} />
          <Stat value={w.podiums} label={t.wrapped.podiums} />
          <Stat value={w.points} label={t.wrapped.points} />
        </div>
        {w.rank && <Big>{(finished ? t.wrapped.rank : t.wrapped.rankSoFar)(ordinal(w.rank), w.drivers)}</Big>}
      </Slide>

      {w.best && (
        <Slide kicker={t.wrapped.bestDay} icon={<Trophy />}>
          <Big>{t.wrapped.bestLine(ordinal(w.best.position), raceTitle({ round: w.best.race.round, track: { name: w.best.race.trackName } }))}</Big>
          {w.best.startPosition && <p className="text-lg opacity-80">{t.wrapped.fromGrid(ordinal(w.best.startPosition))}</p>}
        </Slide>
      )}

      {w.comeback && (
        <Slide kicker={t.wrapped.comeback} icon={<TrendingUp />} tone="light">
          <Big>{t.wrapped.comebackLine(w.comeback.gained, w.comeback.race.trackName)}</Big>
          <p className="text-lg text-fg-muted">{t.wrapped.comebackDetail(ordinal(w.comeback.startPosition!), ordinal(w.comeback.position))}</p>
        </Slide>
      )}

      {(w.nemesis || w.victim) && (
        <Slide kicker={t.wrapped.rivals} icon={<Swords />}>
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              { label: t.wrapped.nemesis, line: t.wrapped.nemesisLine, r: w.nemesis },
              { label: t.wrapped.victim, line: t.wrapped.victimLine, r: w.victim },
            ].map(
              ({ label, line, r }) =>
                r && (
                  <div key={label} className="flex flex-col gap-2">
                    <span className="font-display text-sm font-bold uppercase tracking-wide opacity-70">{label}</span>
                    <RivalName driver={rival(r.userId)} />
                    <span className="opacity-80">{line(r.times, r.meetings)}</span>
                  </div>
                ),
            )}
          </div>
        </Slide>
      )}

      {(w.favouriteColor || w.favouriteTrack) && (
        <Slide kicker={t.wrapped.favourites} icon={<Sparkles />} tone="light">
          <div className="grid gap-6 sm:grid-cols-2">
            {w.favouriteColor && (
              <div className="flex items-center gap-4">
                <span aria-hidden className="h-16 w-6 shrink-0 -skew-x-12 ring-1 ring-fg/20" style={{ background: w.favouriteColor.hex }} />
                <div className="flex flex-col">
                  <span className="font-display text-sm font-bold uppercase tracking-wide text-fg-muted">{t.wrapped.car}</span>
                  <span className="font-display text-3xl font-bold uppercase italic">{w.favouriteColor.name}</span>
                  <span className="text-sm text-fg-muted">{t.wrapped.carLine(w.favouriteColor.races)}</span>
                </div>
              </div>
            )}
            {w.favouriteTrack && (
              <div className="flex flex-col">
                <span className="font-display text-sm font-bold uppercase tracking-wide text-fg-muted">{t.wrapped.track}</span>
                <span className="font-display text-3xl font-bold uppercase italic">{w.favouriteTrack.name}</span>
                <span className="text-sm text-fg-muted">{t.wrapped.trackLine(formatDecimal(w.favouriteTrack.average), w.favouriteTrack.races)}</span>
              </div>
            )}
          </div>
        </Slide>
      )}

      <Slide kicker={t.wrapped.extras} icon={<Zap />}>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat value={w.spins} label={t.wrapped.spins} />
          {w.slipstreams != null && <Stat value={w.slipstreams} label={t.wrapped.slipstreams} hint={t.wrapped.slipstreamsHint} />}
          <Stat value={w.driverOfTheDay} label={t.wrapped.dotd} />
          {w.predictions && <Stat value={w.predictions.points} label={t.wrapped.predictionPoints} hint={t.wrapped.predictionsHint(w.predictions.made)} />}
        </div>
      </Slide>

      <Slide kicker={t.wrapped.badges} icon={<Award />} tone="light">
        {w.badges.length ? (
          <ul className="flex flex-wrap gap-3">
            {w.badges.map(({ id, count }) => {
              const a = ACHIEVEMENT_BY_ID.get(id)!;
              return (
                <li key={id} title={a.description} className="flex items-center gap-2 bg-surface py-1.5 pr-4 pl-1.5">
                  <span className={cn("flex size-9 items-center justify-center rounded-full", tierClass[a.tier])}>
                    <AchievementIcon id={id} className="size-4" />
                  </span>
                  <span className="font-display font-bold uppercase italic">{a.name}</span>
                  {count > 1 && <span className="text-sm text-fg-muted">×{count}</span>}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-lg text-fg-muted">{t.wrapped.noBadges}</p>
        )}
      </Slide>
    </div>
  );
}

