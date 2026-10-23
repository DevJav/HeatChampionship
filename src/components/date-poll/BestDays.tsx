import { Check, HelpCircle, X } from "lucide-react";
import type { DatePollView } from "@/lib/data/date-polls";
import { openDays, rankDays, type DayTally } from "@/lib/date-poll";
import { cn } from "@/lib/cn";
import { formatDayName } from "@/lib/format";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { ScheduleRaceButton, type MovableRace } from "./ScheduleRaceButton";
import { t } from "@/i18n";

/** How many days are shown before "show more" */
const TOP = 3;

type Driver = DatePollView["drivers"][number];

type BestDaysProps = {
  poll: DatePollView;
  today: string;
  /** For admins: the races a day can be given to; null for everyone else */
  races: MovableRace[] | null;
};

/** The open days most drivers can make, with who's in, who might be and who's out. */
export function BestDays({ poll, today, races }: BestDaysProps) {
  const ranked = rankDays(openDays(poll, today), poll.answers);
  const top = ranked.slice(0, TOP);
  const rest = ranked.slice(TOP);
  const props = { poll, races, best: ranked[0]?.score };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t.datePoll.bestDays}</CardTitle>
          <CardDescription>{t.datePoll.bestDaysDescription}</CardDescription>
        </div>
      </CardHeader>
      <CardBody className="flex flex-col gap-3">
        {ranked.length === 0 ? (
          <p className="text-sm text-fg-muted">{t.datePoll.noBestDays}</p>
        ) : (
          <>
            <ol className="flex flex-col gap-3">
              {top.map((tally) => (
                <DayRow key={tally.day} tally={tally} {...props} />
              ))}
            </ol>
            {rest.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer text-sm font-semibold text-fg-muted hover:text-fg">{t.datePoll.moreDays(rest.length)}</summary>
                <ol className="mt-3 flex flex-col gap-3">
                  {rest.map((tally) => (
                    <DayRow key={tally.day} tally={tally} {...props} />
                  ))}
                </ol>
              </details>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}

function DayRow({ tally, poll, races, best }: { tally: DayTally; poll: DatePollView; races: MovableRace[] | null; best?: number }) {
  const byId = new Map(poll.drivers.map((d) => [d.id, d]));
  const names = (ids: string[]) => ids.flatMap((id) => byId.get(id) ?? []);
  const answered = new Set([...tally.yes, ...tally.maybe, ...tally.no]);
  const unanswered = poll.drivers.filter((d) => !answered.has(d.id));

  return (
    <li
      className={cn(
        "flex flex-col gap-2 border-l-4 bg-surface px-3 py-2",
        tally.score === best ? "border-gold" : "border-border-strong",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-display text-lg font-bold uppercase">{formatDayName(tally.day)}</span>
        {races && <ScheduleRaceButton pollId={poll.id} day={tally.day} dayName={formatDayName(tally.day)} races={races} />}
      </div>
      <div className="flex flex-col gap-1 text-sm">
        <NameLine icon={<Check className="text-success" />} label={t.datePoll.answers.YES} drivers={names(tally.yes)} />
        <NameLine icon={<HelpCircle className="text-warning" />} label={t.datePoll.answers.MAYBE} drivers={names(tally.maybe)} />
        <NameLine icon={<X className="text-danger" />} label={t.datePoll.answers.NO} drivers={names(tally.no)} />
        <NameLine label={t.datePoll.unanswered} drivers={unanswered} muted />
      </div>
    </li>
  );
}

function NameLine({ icon, label, drivers, muted }: { icon?: React.ReactNode; label: string; drivers: Driver[]; muted?: boolean }) {
  if (drivers.length === 0) return null;
  return (
    <p className={cn("flex items-start gap-1.5 [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0", muted && "text-fg-subtle")}>
      {icon}
      <span>
        <span className="font-semibold">{label}:</span> {drivers.map((d) => d.name).join(", ")}
      </span>
    </p>
  );
}
