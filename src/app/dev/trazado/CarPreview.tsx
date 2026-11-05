"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { TrackMap, type MapCar } from "@/components/race-log/TrackMap";
import { lapSpace, type TrackGeometry, type TrackLayout } from "@/lib/race-log/layout";
import { gridPositions } from "@/lib/race-log/rounds";

/** Six cars in league-ish colours, labelled like the recorder labels drivers */
const TEST_CARS = [
  { id: "a", label: "A", color: "#d10500" },
  { id: "b", label: "B", color: "#2563eb" },
  { id: "c", label: "C", color: "#facc15" },
  { id: "d", label: "D", color: "#16a34a" },
  { id: "e", label: "E", color: "#f5f5f4" },
  { id: "f", label: "F", color: "#1c1917" },
];

type Preset = "none" | "grid" | "full";

function presetCars(preset: Preset, spacesPerLap: number): MapCar[] {
  if (preset === "none") return [];
  if (preset === "grid") {
    const grid = gridPositions(TEST_CARS.map((c) => c.id));
    return TEST_CARS.map((c) => ({ ...c, ...grid[c.id] }));
  }
  // Two cars on every space: shows every spot at once (bridges, hairpins, the grid)
  return Array.from({ length: spacesPerLap * 2 }, (_, i) => {
    const car = TEST_CARS[i % TEST_CARS.length];
    return { ...car, id: `${car.id}${i}`, pos: Math.floor(i / 2), spot: i % 2 };
  });
}

/**
 * The editor's preview with test cars on it, to see how cars sit on the track
 * as they do when a race is recorded round by round. Tapping a space drives the
 * next car there; the zoom frames the cars like the recorder does. Key it by
 * circuit so another circuit starts again from its grid.
 */
export function CarPreview({ layout, geometry }: { layout: TrackLayout; geometry: TrackGeometry }) {
  const [preset, setPreset] = useState<Preset>("grid");
  const [cars, setCars] = useState<MapCar[]>(() => presetCars("grid", layout.spacesPerLap));
  const [turn, setTurn] = useState(0);
  const [zoom, setZoom] = useState(false);

  function choose(next: Preset) {
    setPreset(next);
    setCars(presetCars(next, layout.spacesPerLap));
    setTurn(0);
  }

  const movable = preset !== "full" && cars.length > 0;
  const active = movable ? cars[turn % cars.length] : null;

  function tap(space: number) {
    if (!active) return;
    const others = cars.filter((c) => c.id !== active.id && lapSpace(layout, c.pos) === space);
    if (others.length >= 2) return;
    // Same lap as the car was on, so the lap counter isn't thrown off
    const lap = Math.max(0, Math.floor(active.pos / layout.spacesPerLap));
    const spot = others.some((c) => c.spot === 0) ? 1 : 0;
    setCars(cars.map((c) => (c.id === active.id ? { ...c, pos: lap * layout.spacesPerLap + space, spot } : c)));
    setTurn((t) => t + 1);
  }

  const taken = new Map<number, number>();
  for (const c of cars) taken.set(lapSpace(layout, c.pos), (taken.get(lapSpace(layout, c.pos)) ?? 0) + 1);
  const blocked = new Set([...taken].filter(([, n]) => n >= 2).map(([s]) => s));

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap px-3 pt-2 items-center gap-2 text-sm">
        <span className="font-bold">Coches de prueba</span>
        {(
          [
            ["none", "Sin coches"],
            ["grid", "Parrilla"],
            ["full", "Todas las casillas"],
          ] as const
        ).map(([id, label]) => (
          <Button key={id} size="sm" variant={preset === id ? "primary" : "ghost"} onClick={() => choose(id)}>
            {label}
          </Button>
        ))}
        <label className="ml-auto flex items-center gap-1.5">
          <input type="checkbox" checked={zoom} onChange={(e) => setZoom(e.target.checked)} />
          Acercar a los coches
        </label>
      </div>
      <p className="px-3 pb-2 text-xs text-fg-muted">
        {active
          ? `Toca una casilla para llevar el coche ${active.label} (el que parpadea); luego le toca al siguiente.`
          : preset === "full"
            ? "Dos coches en cada casilla: mira que ninguno se salga de la pista ni quede bajo un puente."
            : "Elige la parrilla para mover coches."}
      </p>
      <TrackMap
        layout={layout}
        geometry={geometry}
        cars={cars}
        activeCarId={active?.id ?? null}
        focus={zoom ? cars.map((c) => c.pos) : []}
        blocked={movable ? blocked : undefined}
        distances
        onSpaceTap={movable ? tap : undefined}
      />
    </div>
  );
}
