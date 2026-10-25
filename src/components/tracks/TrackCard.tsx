import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { FlagBackdrop } from "@/components/domain/CountryFlag";
import { SpeedStripes } from "@/components/ui";
import { countryName } from "@/lib/countries";
import { t } from "@/i18n";

type TrackCardProps = {
  track: { slug: string; name: string; countryCode: string | null; expansion: string | null };
  races: number;
  lastWinner: string | null;
};

/** One circuit in the list: a small broadcast banner with its flag; links to the track's page. */
export function TrackCard({ track, races, lastWinner }: TrackCardProps) {
  const country = countryName(track.countryCode);
  const facts = [country !== track.name && country, track.expansion].filter(Boolean).join(" · ");
  return (
    <li>
      <Link
        href={`/circuitos/${track.slug}`}
        className="group relative flex h-full flex-col gap-1 overflow-hidden border-l-4 border-primary px-5 py-4 text-bar-fg surface-bar clip-chamfer"
      >
        {track.countryCode ? (
          <FlagBackdrop code={track.countryCode} className="absolute inset-y-0 right-0 aspect-[2/1] max-w-full opacity-50 transition-opacity group-hover:opacity-70" />
        ) : (
          <SpeedStripes className="absolute inset-y-0 right-0 w-1/2 opacity-80" />
        )}
        <span className="relative font-display text-xs font-bold uppercase tracking-wider text-bar-fg/70">{facts || " "}</span>
        <span className="relative flex items-center gap-1 font-display text-3xl font-bold uppercase italic [text-shadow:0_2px_8px_rgb(0_0_0/0.5)]">
          {track.name}
          <ChevronRight className="size-5 opacity-0 transition-opacity group-hover:opacity-100" />
        </span>
        <span className="relative text-sm text-bar-fg/80">
          {races > 0 ? [t.tracks.races(races), lastWinner && t.tracks.lastWinner(lastWinner)].filter(Boolean).join(" · ") : t.tracks.noRacesYet}
        </span>
      </Link>
    </li>
  );
}
