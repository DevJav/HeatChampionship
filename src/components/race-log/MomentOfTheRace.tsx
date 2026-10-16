import { TrendingUp } from "lucide-react";
import { SpeedStripes } from "@/components/ui";
import type { Moment } from "@/lib/race-log/highlights";
import { t } from "@/i18n";

/** Broadcast-style strip for the biggest one-round climb of the race. */
export function MomentOfTheRace({ moment, name, color }: { moment: Moment; name: string; color: string }) {
  return (
    <div className="relative flex items-center gap-3 overflow-hidden border-l-4 border-primary bg-surface-2 px-4 py-3">
      <SpeedStripes className="absolute inset-y-0 right-0 hidden w-1/3 sm:block" />
      <TrendingUp aria-hidden className="size-5 shrink-0 text-primary" />
      <div className="relative flex min-w-0 flex-col">
        <span className="font-display text-xs font-bold uppercase tracking-wider text-fg-muted">{t.raceLog.momentTitle}</span>
        <span className="flex items-center gap-2 font-display text-lg font-bold italic leading-tight">
          <span aria-hidden className="size-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          {t.raceLog.moment(name, t.common.ordinal(moment.from), t.common.ordinal(moment.to), moment.round)}
        </span>
      </div>
    </div>
  );
}
