import type { TrackGeometry, TrackLayout } from "./layout";
import { franceGeometry, franceLayout } from "./france";
import { greatBritainGeometry, greatBritainLayout } from "./great-britain";
import { italyGeometry, italyLayout } from "./italy";
import { spainGeometry, spainLayout } from "./spain";
import { parseRaceLog } from "./log";
import { usaGeometry, usaLayout } from "./usa";

type TrackDrawing = { layout: TrackLayout; geometry: TrackGeometry };

/** Tracks that can be logged round by round, by Track.slug. Add more as their cards are traced. */
const drawings: Record<string, TrackDrawing> = {
  usa: { layout: usaLayout, geometry: usaGeometry },
  // Spanish and English seed slugs
  francia: { layout: franceLayout, geometry: franceGeometry },
  france: { layout: franceLayout, geometry: franceGeometry },
  "gran-bretana": { layout: greatBritainLayout, geometry: greatBritainGeometry },
  "great-britain": { layout: greatBritainLayout, geometry: greatBritainGeometry },
  italia: { layout: italyLayout, geometry: italyGeometry },
  italy: { layout: italyLayout, geometry: italyGeometry },
  // Expansion circuits created in the live admin panel: slug = slugify(name)
  espana: { layout: spainLayout, geometry: spainGeometry },
};

/** Each traced track once (by its layout's slug), for the /dev/trazado editor */
export function tracedTracks() {
  const seen = new Map<string, TrackDrawing>();
  for (const drawing of Object.values(drawings)) seen.set(drawing.layout.slug, drawing);
  return [...seen.values()];
}

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
