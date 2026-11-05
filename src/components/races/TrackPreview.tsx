import { ChevronRight } from "lucide-react";
import type { RaceDetail } from "@/lib/data/races";
import { countryName } from "@/lib/countries";
import { getStatsData } from "@/lib/data/stats";
import { entrantRecords } from "@/lib/stats";
import { ButtonLink, Section } from "@/components/ui";
import { TrackDriversTable, TrackHistoryCard, TrackStatCards } from "@/components/tracks/TrackRecords";
import { t } from "@/i18n";

const HISTORY_LIMIT = 6;

/**
 * Pre-race look at the track: what has happened here before and how each
 * entrant has done on it. The whole story is on the track's page.
 */
export async function TrackPreview({ race }: { race: RaceDetail }) {
  const { track } = race;
  const { races, drivers } = await getStatsData({ trackId: track.id });

  const entrants = new Map(race.registrations.map((r) => [r.user.id, r]));
  const nameOf = (userId: string) => drivers.get(userId)?.name ?? entrants.get(userId)?.user.name ?? "—";
  const country = countryName(track.countryCode);
  const facts = [country !== track.name && country, track.expansion].filter(Boolean).join(" · ");
  const rows = entrantRecords(races, [...entrants.keys()]);

  return (
    <Section
      title={t.races.track.title(track.name)}
      actions={
        <ButtonLink href={`/circuitos/${track.slug}`} variant="secondary" size="sm">
          {t.tracks.seeTrack} <ChevronRight />
        </ButtonLink>
      }
    >
      {(track.description || facts) && (
        <div className="flex flex-col gap-1 text-sm text-fg-muted">
          {facts && <p className="font-display text-xs font-bold uppercase tracking-wider">{facts}</p>}
          {track.description && <p className="whitespace-pre-line">{track.description}</p>}
        </div>
      )}

      <TrackStatCards races={races} nameOf={nameOf} />

      {races.length > 0 && (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          {rows.length > 0 && (
            <TrackDriversTable
              className="lg:col-span-2"
              title={t.races.track.entrants}
              description={t.races.track.entrantsDescription(track.name)}
              rows={rows}
              driverOf={(userId) => {
                const entrant = entrants.get(userId)!;
                return {
                  name: entrant.user.name,
                  username: entrant.user.username,
                  color: entrant.user.favoriteColor?.hex,
                  detail: entrant.status === "WAITLIST" ? t.races.track.reserve : undefined,
                };
              }}
            />
          )}
          <TrackHistoryCard
            className={rows.length === 0 ? "lg:col-span-3" : undefined}
            races={races}
            drivers={drivers}
            nameOf={nameOf}
            limit={HISTORY_LIMIT}
          />
        </div>
      )}
    </Section>
  );
}
