import Link from "next/link";
import type { RaceListItem } from "@/lib/data/races";
import { cn } from "@/lib/cn";
import { toLocalInput } from "@/lib/dates";
import { raceMonth } from "@/lib/races";
import { formatDayKey, formatMonth, monthOf, monthRange, monthWeeks, WEEKDAYS } from "@/lib/month-calendar";
import { CountryFlag } from "@/components/domain/CountryFlag";
import { MonthPager } from "./MonthPager";
import { RaceRow } from "./RaceRow";
import { t } from "@/i18n";

type RaceCalendarProps = {
  races: RaceListItem[];
  /** Today in Madrid, "2026-11-14" */
  today: string;
};

/** Madrid wall-clock day and time of a race: ["2026-11-14", "19:30"] */
const raceDay = (race: RaceListItem) => toLocalInput(race.scheduledAt).split("T");

/**
 * Month grid (Monday first) per month, from the first race to the last, with
 * that month's races listed below. Races with no day yet are only listed.
 */
export function RaceCalendar({ races, today }: RaceCalendarProps) {
  const byDay = Map.groupBy(races.filter((race) => !race.dateTbd), (race) => raceDay(race)[0]);
  const undated = Map.groupBy(races.filter((race) => race.dateTbd), raceMonth);
  const days = [...races.map((race) => raceDay(race)[0]), today].sort();
  const months = monthRange(monthOf(days[0]), monthOf(days.at(-1)!));

  return (
    <MonthPager
      current={monthOf(today)}
      months={months.map((month) => ({
        key: month,
        label: formatMonth(month),
        content: <MonthView month={month} byDay={byDay} undated={undated.get(month) ?? []} today={today} />,
      }))}
    />
  );
}

type MonthViewProps = {
  month: string;
  byDay: Map<string, RaceListItem[]>;
  /** The month's races with no day yet */
  undated: RaceListItem[];
  today: string;
};

function MonthView({ month, byDay, undated, today }: MonthViewProps) {
  const weeks = monthWeeks(month);
  const monthRaces = [...weeks.flat().flatMap((day) => (day.inMonth ? (byDay.get(day.key) ?? []) : [])), ...undated];

  return (
    <div className="flex flex-col gap-6">
      <div className="surface-panel clip-chamfer overflow-hidden">
        <div className="grid grid-cols-7 surface-bar border-b-2 border-primary text-bar-fg">
          {WEEKDAYS.map((weekday) => (
            <span
              key={weekday}
              className="py-2 text-center font-display text-[11px] font-bold uppercase tracking-wider sm:text-xs"
            >
              {weekday}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-border">
          {weeks.flat().map((day) => (
            <div
              key={day.key}
              className={cn(
                "flex min-h-14 min-w-0 flex-col gap-1 p-1 sm:min-h-24 sm:p-1.5",
                day.inMonth ? "bg-surface" : "bg-surface-2 text-fg-subtle",
              )}
            >
              <time
                dateTime={day.key}
                title={formatDayKey(day.key)}
                className={cn(
                  "self-start px-1.5 font-display text-sm font-bold tabular-nums",
                  day.key === today && "bg-primary text-primary-fg clip-slant",
                )}
              >
                {day.day}
              </time>
              {(byDay.get(day.key) ?? []).map((race) => (
                <CalendarRace key={race.id} race={race} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {monthRaces.length > 0 ? (
        <ol className="flex flex-col gap-3">
          {monthRaces.map((race) => (
            <RaceRow key={race.id} race={race} />
          ))}
        </ol>
      ) : (
        <p className="text-center text-sm text-fg-muted">{t.races.noRacesThisMonth}</p>
      )}
    </div>
  );
}

/** A race inside a day cell: just the flag on phones, flag + track + time from sm up. */
function CalendarRace({ race }: { race: RaceListItem }) {
  const [day, time] = raceDay(race);
  const finished = race.status === "FINISHED";

  return (
    <Link
      href={`/carreras/${race.id}`}
      title={`${t.common.round(race.round)} · ${race.track.name} · ${formatDayKey(day)} ${time}`}
      className={cn(
        "flex min-w-0 items-center gap-1.5 px-1.5 py-1 text-xs font-bold transition-[filter] hover:brightness-110 focus-inset max-sm:justify-center",
        finished ? "surface-bar text-bar-fg" : "bg-primary text-primary-fg gloss",
      )}
    >
      <CountryFlag code={race.track.countryCode} className="h-3 w-[18px] shrink-0" />
      <span className="sr-only sm:not-sr-only sm:truncate sm:uppercase">{race.track.name}</span>
      <span className="ml-auto tabular-nums max-sm:hidden">{time}</span>
    </Link>
  );
}
