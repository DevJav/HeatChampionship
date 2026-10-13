"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { countdownParts } from "@/lib/countdown";

// A shared one-second clock. The server has no "now" worth rendering (it would
// mismatch on hydration), so it renders placeholders and the browser fills them in.
function subscribe(onTick: () => void) {
  const timer = setInterval(onTick, 1000);
  return () => clearInterval(timer);
}
const nowInSeconds = () => Math.floor(Date.now() / 1000);
const noTimeOnServer = () => null;

const LIGHTS = 5;

const pad = (value: number | undefined) => (value == null ? "--" : String(value).padStart(2, "0"));

/** One column of the gantry: two stacked lamps, glowing red when lit. */
function StartLight({ lit }: { lit: boolean }) {
  const lamp = cn(
    "size-3.5 rounded-full border border-black/60 transition-colors duration-500",
    lit ? "bg-primary shadow-[0_0_8px_2px_rgb(209_5_0/0.7)]" : "bg-[#2a2c30]",
  );
  return (
    <span className="flex flex-col gap-1 rounded-sm bg-black/70 p-1">
      <span className={lamp} />
      <span className={lamp} />
    </span>
  );
}

function TimeBlock({ value, label }: { value: string; label: string }) {
  return (
    <span className="flex flex-col items-center">
      <span className="font-display text-4xl font-bold italic leading-none tabular-nums">{value}</span>
      <span className="mt-1 font-display text-[10px] font-bold uppercase tracking-widest text-bar-fg/60">{label}</span>
    </span>
  );
}

const Colon = () => (
  <span aria-hidden className="pb-4 font-display text-3xl font-bold italic leading-none text-primary">
    :
  </span>
);

type RaceCountdownProps = {
  /** Race start, as an ISO string */
  target: string;
  className?: string;
};

/**
 * F1-style countdown: a start-lights gantry over a timing bar. One light comes
 * on for each of the last five days, all five on race day; at the start
 * time they go out — lights out.
 */
export function RaceCountdown({ target, className }: RaceCountdownProps) {
  const now = useSyncExternalStore(subscribe, nowInSeconds, noTimeOnServer);
  const start = new Date(target).getTime();
  const parts = now == null ? null : countdownParts(start, now * 1000);
  const started = now != null && now * 1000 >= start;
  const lit = parts && !started ? Math.max(0, LIGHTS - parts.days) : 0;

  return (
    <div className={cn("flex flex-col items-stretch", className)}>
      <div
        className="flex justify-center gap-1.5 self-center rounded-t-md bg-[#141517] px-3 pt-2 pb-1.5"
        title="Se enciende una luz en cada uno de los cinco últimos días"
      >
        {Array.from({ length: LIGHTS }, (_, i) => (
          <StartLight key={i} lit={i < lit} />
        ))}
      </div>

      <div className="surface-bar clip-chamfer flex items-center border-b-2 border-primary">
        {started ? (
          <p className="w-full px-5 py-4 text-center font-display text-3xl font-bold uppercase italic">¡Luces fuera!</p>
        ) : (
          <div role="timer" aria-label="Cuenta atrás para la salida" className="flex w-full items-center">
            <span className="flex flex-col items-center px-4 py-3">
              <span className="font-display text-5xl font-bold italic leading-none tabular-nums">
                {parts?.days ?? "--"}
              </span>
              <span className="mt-1 font-display text-[10px] font-bold uppercase tracking-widest text-bar-fg/60">
                {parts?.days === 1 ? "Día" : "Días"}
              </span>
            </span>
            <span aria-hidden className="h-12 w-1.5 shrink-0 -skew-x-12 bg-primary" />
            <span className="flex flex-1 items-end justify-center gap-1.5 px-3 py-3">
              <TimeBlock value={pad(parts?.hours)} label="H" />
              <Colon />
              <TimeBlock value={pad(parts?.minutes)} label="M" />
              <Colon />
              <TimeBlock value={pad(parts?.seconds)} label="S" />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
