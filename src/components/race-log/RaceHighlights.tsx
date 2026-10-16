import { Swords, TrendingUp } from "lucide-react";
import { SpeedStripes } from "@/components/ui";
import type { Moment, PairDuel } from "@/lib/race-log/highlights";
import { t } from "@/i18n";

type Car = { name: string; color: string };

/** Broadcast-style strip: a small caption over one bold line. */
function HighlightStrip({ icon, title, children, detail }: { icon: React.ReactNode; title: string; children: React.ReactNode; detail?: string }) {
  return (
    <div className="relative flex items-center gap-3 overflow-hidden border-l-4 border-primary bg-surface-2 px-4 py-3">
      <SpeedStripes className="absolute inset-y-0 right-0 hidden w-1/3 sm:block" />
      <span aria-hidden className="shrink-0 text-primary [&_svg]:size-5">
        {icon}
      </span>
      <div className="relative flex min-w-0 flex-col">
        <span className="font-display text-xs font-bold uppercase tracking-wider text-fg-muted">{title}</span>
        <span className="flex flex-wrap items-center gap-x-2 font-display text-lg font-bold italic leading-tight">{children}</span>
        {detail && <span className="text-xs text-fg-subtle">{detail}</span>}
      </div>
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return <span aria-hidden className="size-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />;
}

/** The biggest one-round climb of the race. */
export function MomentOfTheRace({ moment, car }: { moment: Moment; car: Car }) {
  return (
    <HighlightStrip icon={<TrendingUp />} title={t.raceLog.momentTitle}>
      <Dot color={car.color} />
      {t.raceLog.moment(car.name, t.common.ordinal(moment.from), t.common.ordinal(moment.to), moment.round)}
    </HighlightStrip>
  );
}

/** The pair that swapped places most often. */
export function RivalryOfTheRace({ rivalry, a, b }: { rivalry: PairDuel; a: Car; b: Car }) {
  const detail = [t.raceLog.rivalrySwaps(rivalry.swaps), rivalry.close > 0 && t.raceLog.rivalryClose(rivalry.close)].filter(Boolean).join(" · ");
  return (
    <HighlightStrip icon={<Swords />} title={t.raceLog.rivalryTitle} detail={detail}>
      <span className="flex items-center gap-2">
        <Dot color={a.color} />
        {a.name}
      </span>
      <span className="text-sm text-fg-muted">vs</span>
      <span className="flex items-center gap-2">
        <Dot color={b.color} />
        {b.name}
      </span>
    </HighlightStrip>
  );
}
