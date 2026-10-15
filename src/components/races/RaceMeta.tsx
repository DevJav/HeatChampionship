import { CalendarDays, MapPin, RotateCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { raceLaps } from "@/lib/races";
import { t } from "@/i18n";

type RaceMetaProps = {
  race: {
    scheduledAt: Date;
    location: string | null;
    laps: number | null;
    track: { defaultLaps: number | null };
  };
  className?: string;
};

/** Date · location · laps, with icons. */
export function RaceMeta({ race, className }: RaceMetaProps) {
  const laps = raceLaps(race);
  return (
    <ul className={cn("flex flex-wrap gap-x-5 gap-y-1 text-sm [&_svg]:size-4 [&_svg]:shrink-0", className)}>
      <li className="flex items-center gap-1.5">
        <CalendarDays /> {formatDateTime(race.scheduledAt)}
      </li>
      {race.location && (
        <li className="flex items-center gap-1.5">
          <MapPin /> {race.location}
        </li>
      )}
      {laps && (
        <li className="flex items-center gap-1.5">
          <RotateCw /> {t.common.laps(laps)}
        </li>
      )}
    </ul>
  );
}
