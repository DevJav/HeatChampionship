import type { RaceStatus, SeasonStatus } from "@/generated/prisma/client";
import type { RacePhase } from "./registration-rules";
import { t } from "@/i18n";

/** "Ronda 3 · Italia" */
export function raceTitle(race: { round: number; track: { name: string } }) {
  return `${t.common.round(race.round)} · ${race.track.name}`;
}

/** Laps set on the race, falling back to the track's default. */
export function raceLaps(race: { laps: number | null; track: { defaultLaps: number | null } }) {
  return race.laps ?? race.track.defaultLaps;
}

type Tone = "neutral" | "primary" | "accent" | "success" | "warning" | "danger" | "info" | "bar";

/** Labels for the status the admin sets (race form). */
export const RACE_STATUS: Record<RaceStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: t.races.status.DRAFT, tone: "neutral" },
  UPCOMING: { label: t.races.status.UPCOMING, tone: "accent" },
  OPEN: { label: t.races.status.OPEN, tone: "success" },
  CLOSED: { label: t.races.status.CLOSED, tone: "warning" },
  FINISHED: { label: t.races.status.FINISHED, tone: "bar" },
};

/** Labels for what players see (status + deadline + start time). */
export const RACE_PHASE: Record<RacePhase, { label: string; tone: Tone }> = {
  DRAFT: { label: t.races.status.DRAFT, tone: "neutral" },
  UPCOMING: { label: t.races.status.UPCOMING, tone: "accent" },
  OPEN: { label: t.races.status.OPEN, tone: "success" },
  CLOSED: { label: t.races.status.CLOSED, tone: "warning" },
  AWAITING_RESULTS: { label: t.races.status.AWAITING_RESULTS, tone: "info" },
  FINISHED: { label: t.races.status.FINISHED, tone: "bar" },
};

export const SEASON_STATUS: Record<SeasonStatus, { label: string; tone: Tone }> = {
  UPCOMING: { label: t.races.seasonStatus.UPCOMING, tone: "info" },
  ACTIVE: { label: t.races.seasonStatus.ACTIVE, tone: "success" },
  FINISHED: { label: t.races.seasonStatus.FINISHED, tone: "bar" },
};
