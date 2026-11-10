"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Dices } from "lucide-react";
import { Button, Select } from "@/components/ui";
import { Replay3D } from "@/components/race-log/replay3d/Replay3D";
import { isFinished } from "@/lib/race-log/rounds";
import { seededRandom, simulateRace } from "@/lib/race-log/simulate";
import { trackDrawing } from "@/lib/race-log/tracks";

type TrackInfo = { slug: string; spaces: number; corners: number; laps: number };

const COLORS = ["#e8112d", "#1f6bff", "#12b84a", "#f2a900", "#ff6fb5", "#f4f4f2", "#2b2b2b", "#8a2be2", "#00b8d9", "#ff7a00", "#8b5a2b", "#9be15d"];
const RADIO = ["¡Vaya carrera!", "Me he quedado sin cartas de calor en la última curva.", "La próxima vez no me adelantas.", "Los neumáticos no daban para más."];
/** Up to a full race: siteConfig.maxPlayersPerRace */
const COUNTS = Array.from({ length: 11 }, (_, i) => i + 2);

/** Pick a track and a made-up race, and watch it. */
export function ReplayReview({ tracks }: { tracks: TrackInfo[] }) {
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(6);
  const [seed, setSeed] = useState(1);
  const [stopEarly, setStopEarly] = useState(false);
  const track = tracks[index];

  const race = useMemo(() => {
    const { layout } = trackDrawing(track.slug)!;
    const cars = Array.from({ length: count }, (_, i) => ({ id: `car${i}`, name: `Piloto ${i + 1}`, color: COLORS[i] }));
    const ids = cars.map((car) => car.id);
    const all = simulateRace(layout, ids, seededRandom(seed * 97 + count));
    // The log stops as soon as the first car is past the flag
    const firstOver = all.findIndex((round) => ids.some((id) => isFinished(layout, round.positions[id])));
    const rounds = stopEarly ? all.slice(0, firstOver + 1) : all;
    const radio = Object.fromEntries(ids.slice(0, RADIO.length).map((id, i) => [id, RADIO[i]]));
    return { cars, rounds, radio, laps: layout.laps };
  }, [track.slug, count, seed, stopEarly]);

  const step = (by: number) => setIndex((index + by + tracks.length) % tracks.length);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="icon" variant="secondary" aria-label="Circuito anterior" onClick={() => step(-1)}>
          <ChevronLeft />
        </Button>
        <Select value={track.slug} onChange={(e) => setIndex(tracks.findIndex((t) => t.slug === e.target.value))} aria-label="Circuito" className="h-9 w-auto">
          {tracks.map((t, i) => (
            <option key={t.slug} value={t.slug}>
              {i + 1}. {t.slug}
            </option>
          ))}
        </Select>
        <Button size="icon" variant="secondary" aria-label="Circuito siguiente" onClick={() => step(1)}>
          <ChevronRight />
        </Button>
        <Select value={count} onChange={(e) => setCount(Number(e.target.value))} aria-label="Coches" className="h-9 w-auto">
          {COUNTS.map((n) => (
            <option key={n} value={n}>
              {n} coches
            </option>
          ))}
        </Select>
        <Button size="sm" variant="secondary" title="Otra carrera simulada" onClick={() => setSeed(seed + 1)}>
          <Dices /> Semilla {seed}
        </Button>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={stopEarly} onChange={(e) => setStopEarly(e.target.checked)} className="accent-primary" />
          El registro acaba antes de que lleguen todos
        </label>
        <span className="ml-auto text-sm tabular-nums text-fg-muted">
          {track.spaces} casillas · {track.corners} curvas · {track.laps} vueltas · {race.rounds.length - 1} rondas
        </span>
      </div>
      <Replay3D
        key={`${track.slug}-${count}-${seed}-${stopEarly}`}
        raceId={`dev-${track.slug}-${count}-${seed}-${stopEarly}`}
        track={track.slug}
        laps={race.laps}
        cars={race.cars}
        rounds={race.rounds}
        title={track.slug}
        radio={race.radio}
      />
    </div>
  );
}
