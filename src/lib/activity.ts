import type { ActivityType } from "@/generated/prisma/client";
import { formatShortDate } from "./format";
import { raceTitle } from "./races";
import { t } from "@/i18n";

/** A stored feed entry with what's needed to describe it (see lib/data/activity.ts). */
export type ActivityRecord = {
  type: ActivityType;
  actor: { name: string; username: string | null } | null;
  race: { id: string; round: number; scheduledAt: Date; track: { name: string }; winner: string | null } | null;
  season: { id: string; name: string; champion: string | null } | null;
};

/**
 * Sentence and link for a feed entry. `subject` is the driver's name, shown in
 * bold before `text`; without one, `text` is the whole sentence.
 * Built when shown, so renamed drivers and edited results stay current.
 */
export function describeActivity(a: ActivityRecord): { subject: string | null; text: string; href: string } {
  const subject = a.actor?.name ?? null;
  const race = a.race ? raceTitle(a.race) : t.activity.aRace;
  const raceHref = a.race ? `/carreras/${a.race.id}` : "/carreras";
  const season = a.season?.name ?? t.activity.theSeason;
  const seasonHref = a.season ? `/clasificacion?temporada=${a.season.id}` : "/clasificacion";

  switch (a.type) {
    case "PLAYER_JOINED":
      return {
        subject,
        text: t.activity.joined,
        href: a.actor?.username ? `/pilotos/${a.actor.username}` : "/pilotos",
      };
    case "RACE_ANNOUNCED": {
      const when = a.race ? formatShortDate(a.race.scheduledAt) : "";
      return { subject: null, text: t.activity.raceAnnounced(race, when), href: raceHref };
    }
    case "SIGNUPS_OPENED":
      return { subject: null, text: t.activity.signupsOpened(race), href: raceHref };
    case "RACE_SIGNUP":
      return { subject, text: t.activity.signedUp(race), href: raceHref };
    case "RACE_WITHDRAWAL":
      return { subject, text: t.activity.withdrew(race), href: raceHref };
    case "RESULTS_PUBLISHED": {
      return { subject: null, text: t.activity.results(race, a.race?.winner ?? null), href: raceHref };
    }
    case "DRIVER_OF_THE_DAY":
      return { subject, text: t.activity.driverOfTheDay(race), href: raceHref };
    case "PHOTOS_ADDED":
      return { subject, text: t.activity.photos(race), href: `${raceHref}#fotos` };
    case "SEASON_STARTED":
      return { subject: null, text: t.activity.seasonStarted(season), href: seasonHref };
    case "SEASON_FINISHED": {
      return { subject: null, text: t.activity.seasonFinished(season, a.season?.champion ?? null), href: seasonHref };
    }
  }
}
