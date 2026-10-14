import type { RaceStatus, SeasonStatus } from "@/generated/prisma/client";
import type { RacePhase } from "./registration-rules";

/** "Ronda 3 · Italia" */
export function raceTitle(race: { round: number; track: { name: string } }) {
  return `Ronda ${race.round} · ${race.track.name}`;
}

/** Laps set on the race, falling back to the track's default. */
export function raceLaps(race: { laps: number | null; track: { defaultLaps: number | null } }) {
  return race.laps ?? race.track.defaultLaps;
}

type Tone = "neutral" | "primary" | "accent" | "success" | "warning" | "danger" | "info" | "bar";

/** Labels for the status the admin sets (race form). */
export const RACE_STATUS: Record<RaceStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "Borrador", tone: "neutral" },
  UPCOMING: { label: "Próximamente", tone: "accent" },
  OPEN: { label: "Inscripción abierta", tone: "success" },
  CLOSED: { label: "Inscripción cerrada", tone: "warning" },
  FINISHED: { label: "Finalizada", tone: "bar" },
};

/** Labels for what players see (status + deadline + start time). */
export const RACE_PHASE: Record<RacePhase, { label: string; tone: Tone }> = {
  DRAFT: { label: "Borrador", tone: "neutral" },
  UPCOMING: { label: "Próximamente", tone: "accent" },
  OPEN: { label: "Inscripción abierta", tone: "success" },
  CLOSED: { label: "Inscripción cerrada", tone: "warning" },
  AWAITING_RESULTS: { label: "Pendiente de resultados", tone: "info" },
  FINISHED: { label: "Finalizada", tone: "bar" },
};

export const SEASON_STATUS: Record<SeasonStatus, { label: string; tone: Tone }> = {
  UPCOMING: { label: "Próxima", tone: "info" },
  ACTIVE: { label: "En curso", tone: "success" },
  FINISHED: { label: "Terminada", tone: "bar" },
};
