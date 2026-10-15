import Link from "next/link";
import { CalendarPlus, Camera, ClipboardPen, Flag, Rocket, Trophy, UserCheck, UserMinus, UserPlus } from "lucide-react";
import type { ActivityItem } from "@/lib/data/activity";
import { cn } from "@/lib/cn";
import { dateParts, formatDate, formatRelative } from "@/lib/format";
import { Avatar } from "@/components/ui";
import { t } from "@/i18n";

const TYPE_ICON = {
  PLAYER_JOINED: UserPlus,
  RACE_ANNOUNCED: CalendarPlus,
  SIGNUPS_OPENED: ClipboardPen,
  RACE_SIGNUP: UserCheck,
  RACE_WITHDRAWAL: UserMinus,
  RESULTS_PUBLISHED: Flag,
  PHOTOS_ADDED: Camera,
  SEASON_STARTED: Rocket,
  SEASON_FINISHED: Trophy,
} satisfies Record<ActivityItem["type"], unknown>;

/** "hace 3 horas", or the time of day where entries are already grouped by day. */
type TimeStyle = "relative" | "clock";

function ActivityRow({ item, time }: { item: ActivityItem; time: TimeStyle }) {
  const Icon = TYPE_ICON[item.type];
  return (
    <li className="border-b border-border/60 last:border-b-0">
      <Link href={item.href} className="flex items-start gap-3 px-4 py-3 text-sm transition-colors hover:bg-surface-2">
        {/* The driver's avatar with the kind of entry as a badge, or just the icon */}
        <span className="relative mt-0.5 shrink-0">
          {item.actor ? (
            <Avatar name={item.actor.name} src={item.actor.image} color={item.actor.color} size="sm" />
          ) : (
            <span className="flex size-7 items-center justify-center surface-bar">
              <Icon className="size-4" aria-hidden />
            </span>
          )}
          {item.actor && (
            <span className="absolute -right-1.5 -bottom-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-primary-fg">
              <Icon className="size-2.5" aria-hidden />
            </span>
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="leading-snug">
            {item.subject && <strong className="font-semibold">{item.subject} </strong>}
            {item.text}
          </span>
          <time dateTime={item.createdAt.toISOString()} className="text-xs text-fg-subtle">
            {time === "clock" ? dateParts(item.createdAt).time : formatRelative(item.createdAt)}
          </time>
        </span>
      </Link>
    </li>
  );
}

/** Feed entries newest first. */
export function ActivityList({
  items,
  time = "relative",
  className,
}: {
  items: ActivityItem[];
  time?: TimeStyle;
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-col", className)}>
      {items.map((item) => (
        <ActivityRow key={item.id} item={item} time={time} />
      ))}
    </ul>
  );
}

/** "Today", "Yesterday" or the date, in the site's time zone. */
function dayLabel(date: Date, now: Date) {
  const day = formatDate(date);
  if (day === formatDate(now)) return t.activity.today;
  if (day === formatDate(new Date(now.getTime() - 86_400_000))) return t.activity.yesterday;
  return day;
}

/** Feed entries under a heading per day. */
export function ActivityByDay({ items }: { items: ActivityItem[] }) {
  const now = new Date();
  const days: { label: string; items: ActivityItem[] }[] = [];
  for (const item of items) {
    const label = dayLabel(item.createdAt, now);
    if (days.at(-1)?.label === label) days.at(-1)!.items.push(item);
    else days.push({ label, items: [item] });
  }
  return (
    <div className="flex flex-col">
      {days.map((day) => (
        <section key={day.label}>
          <h2 className="border-b border-border/60 bg-surface-2 px-4 py-1.5 text-sm text-fg-muted">{day.label}</h2>
          <ActivityList items={day.items} time="clock" />
        </section>
      ))}
    </div>
  );
}
