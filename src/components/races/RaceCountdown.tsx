"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { countdownParts } from "@/lib/countdown";
import { SegmentDisplay } from "@/components/ui";
import { t } from "@/i18n";

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
        // Printed on the faceplate, so it stays crisp above the glass reflections
        "relative z-20 justify-self-center font-display text-[11px] font-bold uppercase tracking-wide whitespace-nowrap text-(--led-label) @sm:text-sm",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** A cutout in the faceplate: the LEDs sit back behind it, shaded by its edges. */
function Window({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative flex overflow-hidden rounded-[2px] bg-(--led-panel) bg-[radial-gradient(var(--led-grid)_0.75px,transparent_1px)] bg-size-[4px_4px] p-1.5 shadow-[0_1px_0_rgb(255_255_255/0.05)] @sm:px-2.5 @sm:py-2",
        className,
      )}
    >
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgb(0_0_0),inset_0_3px_0_rgb(0_0_0),inset_0_14px_12px_-6px_rgb(0_0_0),inset_8px_0_10px_-5px_rgb(0_0_0/0.85),inset_-4px_0_6px_-3px_rgb(0_0_0/0.6)]"
      />
    </div>
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
    // Frame: dark bezel around the faceplate
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
            ? t.races.countdown.label(parts.days, parts.hours, parts.minutes)
            : t.races.countdown.fallbackLabel
        }
        className="relative overflow-hidden bg-linear-to-b from-(--led-face) to-(--led-face-dark) px-3 py-2.5 @sm:px-5 @sm:py-3.5"
      >
        {started ? (
          <div className="flex flex-col items-center gap-2">
            <Label>{t.races.countdown.lightsOut}</Label>
            <Window>
              <SegmentDisplay value="00:00:00" className={cn(digits, "animate-pulse")} />
            </Window>
          </div>
        ) : (
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] items-end gap-x-1 gap-y-1.5 @sm:gap-x-2">
            <Label>{parts?.days === 1 ? t.races.countdown.day : t.races.countdown.days}</Label>
            <span />
            <Label>{t.races.countdown.hours}</Label>
            <span />
            <Label>{t.races.countdown.minutes}</Label>
            <span />
            <Label>{t.races.countdown.seconds}</Label>

            <Window>
              <SegmentDisplay value={parts ? String(parts.days).padStart(2, "0") : "--"} className={digits} />
            </Window>
            <span />
            {/* Subgrid keeps hours, minutes and seconds under their labels */}
            <Window className="col-span-5 grid grid-cols-subgrid">
              {time.split(":").flatMap((pair, i) => [
                ...(i > 0 ? [<SegmentDisplay key={`colon-${i}`} value=":" className={digits} />] : []),
                <SegmentDisplay key={pair + i} value={pair} className={cn(digits, "justify-self-center")} />,
              ])}
            </Window>
          </div>
        )}
        {/* Glass over the faceplate; the labels stack above its reflections */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(160deg,rgb(255_255_255/0.05),rgb(255_255_255/0.015)_35%,transparent_36%),linear-gradient(110deg,transparent_58%,rgb(255_255_255/0.035)_63%,rgb(255_255_255/0.01)_70%,transparent_76%)] shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]"
        />
      </div>
    </div>
  );
}
