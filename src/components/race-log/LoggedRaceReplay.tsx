"use client";

import type { LoggedRound } from "@/lib/race-log/rounds";
import { trackDrawing } from "@/lib/race-log/tracks";
import { RaceReplay, type LogCarView } from "./RaceReplay";

/** Replay of a stored log; the track drawing is looked up here so it isn't sent as props. */
export function LoggedRaceReplay({ track, laps, cars, rounds }: { track: string; laps: number; cars: LogCarView[]; rounds: LoggedRound[] }) {
  const drawing = trackDrawing(track, laps);
  if (!drawing) return null;
  return <RaceReplay layout={drawing.layout} geometry={drawing.geometry} cars={cars} rounds={rounds} />;
}
