/** What leaves the site about a race: WhatsApp message and calendar invite. */

import { siteConfig } from "@/config/site";
import type { CalendarEvent } from "./calendar";
import { formatRaceDate } from "./format";
import { raceTitle } from "./races";
import { racePhase, type WindowRace } from "./registration-rules";
import { t } from "@/i18n";

type ShareRace = WindowRace & {
  id: string;
  updatedAt: Date;
  round: number;
  scheduledAt: Date;
  dateTbd: boolean;
  location: string | null;
  notes: string | null;
  maxPlayers: number;
  track: { name: string };
  season: { name: string };
};

const HOUR = 3_600_000;

export function raceCalendarEvent(race: ShareRace, url: string): CalendarEvent {
  return {
    uid: `race-${race.id}@heat-championship`,
    updatedAt: race.updatedAt,
    title: `Heat · ${raceTitle(race)}`,
    start: race.scheduledAt,
    end: new Date(race.scheduledAt.getTime() + siteConfig.raceDurationHours * HOUR),
    location: race.location,
    description: [race.season.name, race.notes].filter(Boolean).join("\n"),
    url,
  };
}

type ShareContext = {
  /** Confirmed drivers so far (upcoming races) */
  confirmed: number;
  /** Top three names (finished races) */
  podium: string[];
};

/** Group-chat message for the race, depending on where it stands. */
export function raceShareText(race: ShareRace, url: string, { confirmed, podium }: ShareContext, now = new Date()) {
  const title = `${raceTitle(race)} (${race.season.name})`;
  const phase = racePhase(race, now);

  if (phase === "FINISHED" && podium.length > 0) {
    const [winner, ...rest] = podium;
    const others = rest.map((name, i) => `${t.common.ordinal(i + 2)} ${name}`).join(", ");
    return [t.races.share.won(title, winner, others), t.races.share.results(url)].join("\n");
  }

  const seats =
    confirmed >= race.maxPlayers
      ? t.races.share.seatsFull(race.maxPlayers)
      : t.races.share.seatsOpen(confirmed, race.maxPlayers);
  return [
    `🏁 ${title}`,
    `📅 ${formatRaceDate(race)}`,
    ...(race.location ? [`📍 ${race.location}`] : []),
    ...(phase === "OPEN" ? [`🏎️ ${seats}`] : []),
    url,
  ].join("\n");
}

export const whatsappUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
