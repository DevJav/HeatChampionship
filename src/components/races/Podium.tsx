import { cn } from "@/lib/cn";
import type { RaceResultDetail } from "@/lib/data/results";
import { Avatar } from "@/components/ui";
import { PositionBadge } from "@/components/domain/PositionBadge";

const steps = [
  { place: 2, height: "h-20 sm:h-24" },
  { place: 1, height: "h-28 sm:h-32" },
  { place: 3, height: "h-14 sm:h-16" },
];

/** Top three on a podium, winner in the middle. */
export function Podium({ results }: { results: RaceResultDetail[] }) {
  const byPlace = new Map(results.filter((r) => r.position != null).map((r) => [r.position!, r]));

  return (
    <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
      {steps.map(({ place, height }) => {
        const result = byPlace.get(place);
        return (
          <div key={place} className="flex min-w-0 flex-col items-center gap-2">
            {result && (
              <>
                <Avatar
                  name={result.user.name}
                  src={result.user.image}
                  color={result.carColor?.hex ?? result.user.favoriteColor?.hex}
                  size={place === 1 ? "xl" : "lg"}
                />
                <span className="max-w-full truncate text-center font-display text-lg font-bold uppercase italic">
                  {result.user.name}
                </span>
                <span className="text-sm text-fg-muted tabular-nums">{result.points} pts</span>
              </>
            )}
            <div className={cn("flex w-full items-start justify-center surface-bar pt-3", height)}>
              <PositionBadge position={place} size="lg" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
