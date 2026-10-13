"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { countdownParts } from "@/lib/countdown";
import { SegmentDisplay } from "@/components/ui";

// A shared one-second clock. The server has no "now" worth rendering (it would
// mismatch on hydration), so it renders dashes and the browser fills them in.
function subscribe(onTick: () => void) {
  const timer = setInterval(onTick, 1000);
  return () => clearInterval(timer);
}
const nowInSeconds = () => Math.floor(Date.now() / 1000);
const noTimeOnServer = () => null;

const pad = (value: number | undefined) => (value == null ? "--" : String(value).padStart(2, "0"));

/** Digit height follows the board's width */
const digits = "h-9 @xs:h-11 @sm:h-14";

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "justify-self-center font-display text-[11px] font-bold uppercase tracking-wide whitespace-nowrap text-(--led-label) @sm:text-sm",
        className,
      )}
    >
      {children}
    </span>
  );
}

type RaceCountdownProps = {
  /** Race start, as an ISO string */
  target: string;
  className?: string;
};

/** LED countdown board to the race start: days, then hours:minutes:seconds. */
export function RaceCountdown({ target, className }: RaceCountdownProps) {
  const now = useSyncExternalStore(subscribe, nowInSeconds, noTimeOnServer);
  const start = new Date(target).getTime();
  const parts = now == null ? null : countdownParts(start, now * 1000);
  const started = now != null && now * 1000 >= start;
  const time = `${pad(parts?.hours)}:${pad(parts?.minutes)}:${pad(parts?.seconds)}`;

  return (
    // Frame: dark bezel around a black panel
    <div
      className={cn(
        "@container rounded-sm bg-linear-to-b from-(--led-frame) to-(--led-frame-dark) p-1.5 shadow-[0_2px_6px_rgb(0_0_0/0.35)]",
        className,
      )}
    >
      <div
        role="timer"
        aria-label={
          parts && !started
            ? `Salida en ${parts.days} días, ${parts.hours} horas, ${parts.minutes} minutos`
            : "Cuenta atrás para la salida"
        }
        className="relative overflow-hidden bg-(--led-panel) px-3 py-2.5 shadow-[inset_0_0_12px_rgb(0_0_0)] @sm:px-5 @sm:py-3.5"
      >
        {started ? (
          <div className="flex flex-col items-center gap-2">
            <Label>¡Luces fuera!</Label>
            <SegmentDisplay value="00:00:00" className={cn(digits, "animate-pulse")} />
          </div>
        ) : (
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] items-end gap-x-1 gap-y-1.5 @sm:gap-x-2">
            <Label>{parts?.days === 1 ? "Día" : "Días"}</Label>
            <span />
            <Label>Horas</Label>
            <span />
            <Label>Minutos</Label>
            <span />
            <Label>Segundos</Label>

            <SegmentDisplay value={parts ? String(parts.days).padStart(2, "0") : "--"} className={digits} />
            <span />
            {time.split(":").flatMap((pair, i) => [
              ...(i > 0 ? [<SegmentDisplay key={`colon-${i}`} value=":" className={digits} />] : []),
              <SegmentDisplay key={pair + i} value={pair} className={cn(digits, "justify-self-center")} />,
            ])}
          </div>
        )}
        {/* Glass reflection on the upper half */}
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-white/6 to-transparent" />
      </div>
    </div>
  );
}
