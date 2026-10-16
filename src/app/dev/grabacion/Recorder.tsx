"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Shuffle } from "lucide-react";
import { Button, Select, Skeleton } from "@/components/ui";
import { RaceRecorder, type RecorderLog } from "@/components/race-log/RaceRecorder";
import { useOnClient } from "@/components/race-log/viewport";
import { gridPositions, turnOrder } from "@/lib/race-log/rounds";
import { simulateRound } from "@/lib/race-log/simulate";
import { usaGeometry as geometry, usaLayout as layout } from "@/lib/race-log/usa";

const ROSTER = [
  { id: "javier", name: "Javier", label: "J", color: "#d10500" },
  { id: "ana", name: "Ana", label: "A", color: "#1d4ed8" },
  { id: "marco", name: "Marco", label: "M", color: "#facc15" },
  { id: "lucia", name: "Lucía", label: "L", color: "#15803d" },
  { id: "pablo", name: "Pablo", label: "P", color: "#1c1917" },
  { id: "sara", name: "Sara", label: "S", color: "#f5f5f4" },
  { id: "diego", name: "Diego", label: "D", color: "#ea580c" },
  { id: "elena", name: "Elena", label: "E", color: "#7e22ce" },
];

const STORAGE_KEY = "heat:race-log-demo";

type Demo = RecorderLog & { count: number };

function newDemo(count: number): Demo {
  const grid = gridPositions(ROSTER.slice(0, count).map((c) => c.id));
  return { count, rounds: [{ positions: grid, flags: {} }], draft: { positions: grid, placed: [], flags: {} }, history: [] };
}

function loadDemo(): Demo {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (saved?.count && saved.rounds) return saved;
  } catch {}
  return newDemo(6);
}

/** The recorder with made-up drivers, kept in this browser only, plus a button to simulate the rest of the race. */
export function Recorder() {
  return useOnClient() ? <DemoSession /> : <Skeleton className="aspect-[1000/646] w-full" />;
}

function DemoSession() {
  const [demo, setDemo] = useState(loadDemo);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demo));
    } catch {}
  }, [demo]);

  const cars = ROSTER.slice(0, demo.count);
  const last = demo.rounds[demo.rounds.length - 1].positions;

  function simulateRest() {
    setDemo((d) => {
      let rounds = d.rounds;
      for (let i = 0; i < 60; i++) {
        const end = rounds[rounds.length - 1].positions;
        if (turnOrder(layout, end).length === 0) break;
        rounds = [...rounds, simulateRound(layout, end)];
      }
      const end = rounds[rounds.length - 1].positions;
      return { ...d, rounds, draft: { positions: end, placed: [], flags: {} }, history: [] };
    });
  }

  return (
    <RaceRecorder
      layout={layout}
      geometry={geometry}
      cars={cars}
      log={demo}
      setLog={(update) => setDemo((d) => ({ ...(typeof update === "function" ? update(d) : update), count: d.count }))}
      toolbar={
        <>
          <Select aria-label="Número de pilotos" value={demo.count} onChange={(e) => setDemo(newDemo(Number(e.target.value)))} className="w-16">
            {[4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
          <Button variant="secondary" size="icon" className="size-9" title="Nueva carrera" onClick={() => setDemo(newDemo(demo.count))}>
            <RotateCcw />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="size-9"
            title="Simular el resto"
            onClick={simulateRest}
            disabled={turnOrder(layout, last).length === 0}
          >
            <Shuffle />
          </Button>
        </>
      }
    />
  );
}
