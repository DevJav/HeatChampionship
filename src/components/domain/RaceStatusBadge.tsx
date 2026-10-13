import { Badge } from "@/components/ui";
import { racePhase, type WindowRace } from "@/lib/registration-rules";
import { RACE_PHASE } from "@/lib/races";

/**
 * Status as players experience it: an OPEN race shows "closed" after its
 * deadline and "awaiting results" once it has started.
 */
export function RaceStatusBadge({ race }: { race: WindowRace }) {
  const { label, tone } = RACE_PHASE[racePhase(race)];
  return <Badge tone={tone}>{label}</Badge>;
}
