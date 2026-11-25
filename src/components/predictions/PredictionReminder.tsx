import { Target } from "lucide-react";
import type { RaceDetail } from "@/lib/data/races";
import { hasPredicted } from "@/lib/data/predictions";
import { formatDateTime } from "@/lib/format";
import { predictionsOpen } from "@/lib/predictions";
import { getCurrentUser } from "@/lib/session";
import { Alert } from "@/components/ui";
import { PredictionForm } from "./PredictionForm";
import { t } from "@/i18n";

/**
 * Nudges a signed-in user who hasn't made their podium prediction yet, with
 * the button to make it right there. Renders nothing once they have, or while
 * predictions can't be made. Reads the session: render inside <Suspense>.
 */
export async function PredictionReminder({ race, className }: { race: RaceDetail; className?: string }) {
  if (!predictionsOpen(race, new Date())) return null;
  const drivers = race.registrations.filter((r) => r.status === "CONFIRMED").map((r) => r.user);
  if (drivers.length < 3) return null;
  const user = await getCurrentUser();
  if (!user || (await hasPredicted(race.id, user.id))) return null;

  return (
    <Alert tone="warning" icon={<Target />} className={className}>
      <div className="flex flex-col gap-2">
        <p>
          <strong>{t.predictions.reminder.title}</strong>{" "}
          {race.dateTbd ? t.predictions.reminder.body : t.predictions.reminder.bodyUntil(formatDateTime(race.scheduledAt))}
        </p>
        <PredictionForm raceId={race.id} drivers={drivers.map((d) => ({ id: d.id, name: d.name }))} current={null} />
      </div>
    </Alert>
  );
}
