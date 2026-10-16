import type { TrackGeometry, TrackLayout } from "./layout";
import { parseRaceLog } from "./log";
import { usaGeometry, usaLayout } from "./usa";

type TrackDrawing = { layout: TrackLayout; geometry: TrackGeometry };

/** Tracks that can be logged round by round, by Track.slug. Add more as their cards are traced. */
const drawings: Record<string, TrackDrawing> = {
  usa: { layout: usaLayout, geometry: usaGeometry },
};

export function hasTrackDrawing(slug: string) {
  return slug in drawings;
}

/** The track's layout and drawing, with the race's lap count when it differs from the card's. */
export function trackDrawing(slug: string, laps?: number | null): TrackDrawing | null {
  const drawing = drawings[slug];
  if (!drawing) return null;
  return laps && laps !== drawing.layout.laps ? { ...drawing, layout: { ...drawing.layout, laps } } : drawing;
}

/** A stored RaceLog.data with its track layout, or null when it doesn't parse or its track isn't traced. */
export function storedLog(data: unknown) {
  const log = parseRaceLog(data);
  const drawing = log && trackDrawing(log.track, log.laps);
  return log && drawing ? { log, layout: drawing.layout } : null;
}
