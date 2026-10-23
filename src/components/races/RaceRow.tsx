import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import type { RaceListItem } from "@/lib/data/races";
import { cn } from "@/lib/cn";
import { dateParts } from "@/lib/format";
import { italicCenterStyle } from "@/lib/italic-center";
import { CountryFlag } from "@/components/domain/CountryFlag";
import { DriverName } from "@/components/domain/DriverName";
import { PositionBadge } from "@/components/domain/PositionBadge";
import { RaceStatusBadge } from "@/components/domain/RaceStatusBadge";
import { SeatsMeter } from "@/components/domain/SeatsMeter";
import { t } from "@/i18n";

/**
 * One race in the list, as a full-width timing row: date block, track, and
 * the podium (finished) or the seats (upcoming). The whole row links to the race.
 */
export function RaceRow({ race }: { race: RaceListItem }) {
  const date = dateParts(race.scheduledAt);
  const finished = race.status === "FINISHED";

  return (
    <li>
      <Link
        href={`/carreras/${race.id}`}
        className="group grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-3 bg-surface p-3 surface-panel clip-chamfer transition-colors hover:bg-surface-2 sm:gap-x-6 sm:p-4 lg:grid-cols-[auto_1fr_auto_auto]"
      >
        {/* Date block */}
        <span className="flex w-16 flex-col items-center surface-bar border-b-2 border-primary py-1.5 text-bar-fg">
          {/* No day yet: just the month, with a "?" for the day */}
          <span className="text-[10px] font-bold uppercase tracking-widest text-bar-fg/70">{race.dateTbd ? "\u00a0" : date.weekday}</span>
          <span className="font-display text-3xl font-bold italic italic-center leading-none" style={italicCenterStyle(race.dateTbd ? "?" : date.day)}>
            {race.dateTbd ? "?" : date.day}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider">{date.month}</span>
        </span>

        {/* Track and details */}
        <span className="flex min-w-0 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-display text-xs font-bold uppercase tracking-wider text-fg-muted">
              {t.common.round(race.round)}
            </span>
            <RaceStatusBadge race={race} />
          </span>
          <span className="flex items-center gap-2.5">
            <CountryFlag code={race.track.countryCode} className="h-4 w-6 shrink-0 ring-1 ring-border" />
            <span className="font-display text-xl font-bold uppercase italic leading-tight group-hover:text-primary sm:text-2xl">
              {race.track.name}
            </span>
          </span>
          <span className="flex flex-wrap items-center gap-x-3 text-sm text-fg-muted">
            <span>
              {race.dateTbd ? t.races.dateTbdShort : date.time} · {date.year}
            </span>
            {race.location && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden /> {race.location}
              </span>
            )}
          </span>
        </span>

        {/* Podium or seats: own row on small screens */}
        <span
          className={cn(
            "col-span-3 flex lg:col-span-1",
            finished ? "flex-wrap gap-x-5 gap-y-1.5" : "items-center",
          )}
        >
          {finished ? (
            race.results.length > 0 ? (
              race.results.map((result) => (
                <span key={result.user.id} className="flex items-center gap-2">
                  <PositionBadge position={result.position} size="sm" />
                  <DriverName
                    name={result.user.name}
                    username={result.user.username}
                    link={false}
                    color={result.user.favoriteColor?.hex}
                  />
                </span>
              ))
            ) : (
              <span className="text-sm text-fg-subtle">{t.races.noResults}</span>
            )
          ) : (
            <SeatsMeter taken={race._count.registrations} max={race.maxPlayers} />
          )}
        </span>

        <ChevronRight
          aria-hidden
          className="size-5 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-primary max-lg:col-start-3 max-lg:row-start-1"
        />
      </Link>
    </li>
  );
}
