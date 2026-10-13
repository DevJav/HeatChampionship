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

const UNITS = [
  { key: "days", label: "Días" },
  { key: "hours", label: "Horas" },
  { key: "minutes", label: "Min" },
  { key: "seconds", label: "Seg" },
] as const;

type RaceCountdownProps = {
  /** Race start, as an ISO string */
  target: string;
  className?: string;
};

/** Timing-screen countdown to the race start: days, hours, minutes, seconds. */
export function RaceCountdown({ target, className }: RaceCountdownProps) {
  const now = useSyncExternalStore(subscribe, nowInSeconds, noTimeOnServer);
  const start = new Date(target).getTime();
  const parts = now == null ? null : countdownParts(start, now * 1000);
  const started = now != null && now * 1000 >= start;

  if (started) {
    return (
      <p className={cn("surface-bar border-l-4 border-primary px-4 py-3 font-display text-2xl font-bold uppercase italic", className)}>
        ¡Luces fuera!
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="font-display text-xs font-bold uppercase tracking-wider text-fg-muted">Salida en</span>
      <ol role="timer" aria-label="Cuenta atrás para la salida" className="grid grid-cols-4 gap-1.5">
        {UNITS.map(({ key, label }) => (
          <li key={key} className="flex flex-col items-center surface-bar border-b-2 border-primary px-1 pt-2 pb-1.5">
            <span className="font-display text-3xl font-bold italic leading-none tabular-nums sm:text-4xl">
              {parts ? String(parts[key]).padStart(2, "0") : "--"}
            </span>
            <span className="mt-1 font-display text-[10px] font-bold uppercase tracking-widest text-bar-fg/70">
              {label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
