import type { TrackGeometry, TrackLayout } from "./layout";
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
