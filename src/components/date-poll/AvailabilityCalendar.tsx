"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Check, HelpCircle, Lock, PaintBucket, Star, X } from "lucide-react";
import type { Availability } from "@/generated/prisma/client";
import { setAvailability, toggleBlockedDay } from "@/actions/date-polls";
import { cn } from "@/lib/cn";
import { isBlockableDay, isOpenDay, rankDays, tallyDays, type DayAnswer, type PollRange } from "@/lib/date-poll";
import { formatMonth, monthWeeks, WEEKDAYS } from "@/lib/month-calendar";
import { Alert, Button, ButtonLink } from "@/components/ui";
import { tabItemClass } from "@/components/ui/tabStyles";
import { t } from "@/i18n";

type Brush = Availability | "BLOCK";

const ANSWER_ICON = { YES: Check, MAYBE: HelpCircle, NO: X } as const;

/** Cell colours for the signed-in driver's answer */
const ANSWER_CLASS: Record<Availability, string> = {
  YES: "bg-success text-white",
  MAYBE: "bg-warning text-white",
  NO: "bg-danger-solid text-white",
};

type AvailabilityCalendarProps = {
  pollId: string;
  poll: PollRange;
  months: string[];
  answers: DayAnswer[];
  /** Number of drivers asked, for the bars under each day */
  drivers: number;
  /** Today in the site time zone, "2026-11-14" */
  today: string;
  /** The signed-in user's id, null when logged out */
  me: string | null;
  admin: boolean;
  /** "sábado, 14 de noviembre" per day, for screen readers */
  dayNames: Record<string, string>;
};

type Change = { kind: "answer"; days: string[]; answer: Availability | null } | { kind: "block"; day: string };

/**
 * The poll's months as tappable grids. Pick an answer (or, for the admin,
 * "Block") and tap days; each tap saves straight away and shows at once.
 */
export function AvailabilityCalendar({ pollId, poll, months, answers, drivers, today, me, admin, dayNames }: AvailabilityCalendarProps) {
  const [brush, setBrush] = useState<Brush>("YES");
  const [error, setError] = useState<string>();
  const [, startTransition] = useTransition();
  const [state, apply] = useOptimistic({ answers, blockedDays: poll.blockedDays }, (current, change: Change) => {
    if (change.kind === "block") {
      const blocked = current.blockedDays.includes(change.day);
      return { ...current, blockedDays: blocked ? current.blockedDays.filter((d) => d !== change.day) : [...current.blockedDays, change.day] };
    }
    const kept = current.answers.filter((a) => a.userId !== me || !change.days.includes(a.day));
    const added = change.answer ? change.days.map((day) => ({ userId: me!, day, answer: change.answer! })) : [];
    return { ...current, answers: [...kept, ...added] };
  });

  const range = { ...poll, blockedDays: state.blockedDays };
  const mine = new Map(state.answers.filter((a) => a.userId === me).map((a) => [a.day, a.answer]));
  const tallies = new Map(
    tallyDays(
      Object.keys(dayNames),
      state.answers.filter((a) => !state.blockedDays.includes(a.day)),
    ).map((tally) => [tally.day, tally]),
  );
  const openDays = Object.keys(dayNames).filter((day) => isOpenDay(range, day, today));
  const bestScore = rankDays(openDays, state.answers)[0]?.score ?? 0;
  const blanks = openDays.filter((day) => !mine.has(day));

  const save = (change: Change) =>
    startTransition(async () => {
      apply(change);
      setError(undefined);
      const result =
        change.kind === "block" ? await toggleBlockedDay(pollId, change.day) : await setAvailability(pollId, change.days, change.answer);
      if (result?.error) setError(result.error);
    });

  const tap = (day: string) => {
    if (brush === "BLOCK") save({ kind: "block", day });
    else save({ kind: "answer", days: [day], answer: mine.get(day) === brush ? null : brush });
  };

  const canTap = (day: string) =>
    brush === "BLOCK" ? admin && isBlockableDay(range, day, today) : me != null && isOpenDay(range, day, today);

  return (
    <div className="flex flex-col gap-4">
      {me ? (
        <div className="flex flex-col gap-2">
          <div role="radiogroup" aria-label={t.datePoll.tapHint} className="flex flex-wrap gap-1">
            {(["YES", "MAYBE", "NO"] as const).map((answer) => {
              const Icon = ANSWER_ICON[answer];
              return (
                <BrushButton key={answer} selected={brush === answer} onSelect={() => setBrush(answer)} swatch={ANSWER_CLASS[answer]}>
                  <Icon /> {t.datePoll.answers[answer]}
                </BrushButton>
              );
            })}
            {admin && (
              <BrushButton selected={brush === "BLOCK"} onSelect={() => setBrush("BLOCK")} swatch="blocked-day text-fg-muted">
                <Lock /> {t.datePoll.block}
              </BrushButton>
            )}
          </div>
          <div className="flex items-center justify-between gap-3">
            {/* Two lines tall on phones, so switching between the hints doesn't move the calendar */}
            <p className="flex min-h-10 items-center text-sm text-fg-muted sm:min-h-0">
              {brush === "BLOCK" ? t.datePoll.blockHint : t.datePoll.tapHint}
            </p>
            {/* Hidden or disabled rather than removed, for the same reason */}
            <Button
              variant="secondary"
              size="sm"
              className={cn("shrink-0", brush === "BLOCK" && "invisible")}
              disabled={brush === "BLOCK" || blanks.length === 0}
              title={brush === "BLOCK" ? undefined : t.datePoll.fillRestHint(t.datePoll.answers[brush])}
              onClick={() => brush !== "BLOCK" && save({ kind: "answer", days: blanks, answer: brush })}
            >
              <PaintBucket /> {t.datePoll.fillRest}
            </Button>
          </div>
        </div>
      ) : (
        <ButtonLink href={`/entrar?volver=${encodeURIComponent("/carreras/fecha")}`} className="self-start">
          {t.datePoll.logInToAnswer}
        </ButtonLink>
      )}

      {error && <Alert tone="danger">{error}</Alert>}

      {months.map((month) => (
        <section key={month} className="flex flex-col gap-2">
          <h3 className="text-xl capitalize">{formatMonth(month)}</h3>
          <div className="surface-panel clip-chamfer overflow-hidden">
            <div className="grid grid-cols-7 surface-bar border-b-2 border-primary text-bar-fg">
              {WEEKDAYS.map((weekday) => (
                <span key={weekday} className="py-2 text-center font-display text-[11px] font-bold uppercase tracking-wider sm:text-xs">
                  {weekday}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-border">
              {monthWeeks(month)
                .flat()
                .map((cell) => {
                  if (!cell.inMonth || !(cell.key in dayNames)) {
                    return <div key={cell.key} className="min-h-16 bg-surface-2 sm:min-h-20" />;
                  }
                  const blocked = state.blockedDays.includes(cell.key);
                  const past = cell.key < today;
                  const answer = mine.get(cell.key);
                  const tally = tallies.get(cell.key)!;
                  const best = bestScore > 0 && !blocked && !past && tally.score === bestScore;
                  const AnswerIcon = answer && ANSWER_ICON[answer];
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      disabled={!canTap(cell.key)}
                      onClick={() => tap(cell.key)}
                      aria-label={
                        blocked
                          ? `${dayNames[cell.key]}. ${t.datePoll.blocked}`
                          : t.datePoll.dayLabel(dayNames[cell.key], answer ? t.datePoll.answers[answer] : null, tally.yes.length, tally.maybe.length)
                      }
                      className={cn(
                        "relative flex min-h-16 min-w-0 flex-col gap-1 p-1 text-left transition-[filter] focus-inset sm:min-h-20 sm:p-1.5",
                        "enabled:cursor-pointer enabled:hover:brightness-95",
                        blocked ? "blocked-day text-fg-subtle" : answer ? ANSWER_CLASS[answer] : "bg-surface",
                        past && "opacity-40",
                      )}
                    >
                      <span className="flex items-center justify-between gap-1">
                        <span
                          className={cn(
                            "px-1 font-display text-sm font-bold tabular-nums",
                            cell.key === today && "bg-primary text-primary-fg clip-slant",
                          )}
                        >
                          {cell.day}
                        </span>
                        {best && <Star aria-label={t.datePoll.best} className={cn("size-3.5 fill-current", answer ? "" : "text-gold")} />}
                        {blocked && <Lock aria-hidden className="size-3.5" />}
                      </span>
                      {AnswerIcon && !blocked && <AnswerIcon aria-hidden className="size-4 self-center" strokeWidth={3} />}
                      {!blocked && drivers > 0 && <TallyBar yes={tally.yes.length} maybe={tally.maybe.length} drivers={drivers} onAnswer={answer != null} />}
                    </button>
                  );
                })}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

function BrushButton({ selected, onSelect, swatch, children }: { selected: boolean; onSelect: () => void; swatch: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(tabItemClass(false), "flex items-center gap-1.5 px-3 [&_svg]:size-4", selected && cn(swatch, "gloss hover:text-inherit"))}
    >
      {children}
    </button>
  );
}

/** How many drivers can (solid) or maybe can (faded) make a day, as a share of everyone asked. */
function TallyBar({ yes, maybe, drivers, onAnswer }: { yes: number; maybe: number; drivers: number; onAnswer: boolean }) {
  return (
    <span className="mt-auto flex flex-col gap-0.5">
      {yes + maybe > 0 && (
        <span className={cn("text-[10px] font-bold tabular-nums leading-none", !onAnswer && "text-fg-muted")}>
          {yes}
          {maybe > 0 && <span className="opacity-70">+{maybe}</span>}
        </span>
      )}
      <span className={cn("flex h-1 w-full overflow-hidden", onAnswer ? "bg-black/20" : "bg-surface-2")}>
        <span className={onAnswer ? "bg-white" : "bg-success"} style={{ width: `${(yes / drivers) * 100}%` }} />
        <span className={onAnswer ? "bg-white/50" : "bg-warning"} style={{ width: `${(maybe / drivers) * 100}%` }} />
      </span>
    </span>
  );
}
