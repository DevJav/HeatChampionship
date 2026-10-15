import type { ActivityType } from "@/generated/prisma/client";
import { formatShortDate } from "./format";
import { raceTitle } from "./races";

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
  const race = a.race ? raceTitle(a.race) : "una carrera";
  const raceHref = a.race ? `/carreras/${a.race.id}` : "/carreras";
  const season = a.season?.name ?? "la temporada";
  const seasonHref = a.season ? `/clasificacion?temporada=${a.season.id}` : "/clasificacion";

  switch (a.type) {
    case "PLAYER_JOINED":
      return {
        subject,
        text: "se ha unido al campeonato",
        href: a.actor?.username ? `/pilotos/${a.actor.username}` : "/pilotos",
      };
    case "RACE_ANNOUNCED": {
      const when = a.race ? ` (${formatShortDate(a.race.scheduledAt)})` : "";
      return { subject: null, text: `Nueva carrera en el calendario: ${race}${when}`, href: raceHref };
    }
    case "SIGNUPS_OPENED":
      return { subject: null, text: `Inscripciones abiertas para ${race}`, href: raceHref };
    case "RACE_SIGNUP":
      return { subject, text: `se ha apuntado a ${race}`, href: raceHref };
    case "RACE_WITHDRAWAL":
      return { subject, text: `se ha retirado de ${race}`, href: raceHref };
    case "RESULTS_PUBLISHED": {
      const winner = a.race?.winner ? `: victoria de ${a.race.winner}` : "";
      return { subject: null, text: `Ya están los resultados de ${race}${winner}`, href: raceHref };
    }
    case "PHOTOS_ADDED":
      return { subject, text: `ha subido fotos de ${race}`, href: `${raceHref}#fotos` };
    case "SEASON_STARTED":
      return { subject: null, text: `Arranca ${season}`, href: seasonHref };
    case "SEASON_FINISHED": {
      const champion = a.season?.champion ? `: el título es para ${a.season.champion}` : "";
      return { subject: null, text: `Termina ${season}${champion}`, href: seasonHref };
    }
  }
}
