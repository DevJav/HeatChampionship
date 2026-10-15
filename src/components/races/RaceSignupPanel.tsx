import { CheckCircle2, Clock, Lock, LogIn } from "lucide-react";
import type { RaceDetail } from "@/lib/data/races";
import { formatDateTime } from "@/lib/format";
import { canWithdraw, signupWindow } from "@/lib/registration-rules";
import { getCurrentUser } from "@/lib/session";
import { Alert, ButtonLink } from "@/components/ui";
import { SeatsMeter } from "@/components/domain/SeatsMeter";
import { SignupForm } from "./SignupForm";
import { t } from "@/i18n";

/**
 * Everything a player needs to join or leave a race: seat count, their
 * status and the right button. Reads the session: render inside <Suspense>.
 */
export async function RaceSignupPanel({ race }: { race: RaceDetail }) {
  const user = await getCurrentUser();
  const signup = signupWindow(race);
  const confirmed = race.registrations.filter((r) => r.status === "CONFIRMED");
  const waitlist = race.registrations.filter((r) => r.status === "WAITLIST");
  const full = confirmed.length >= race.maxPlayers;
  const mine = user ? race.registrations.find((r) => r.user.id === user.id) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <SeatsMeter taken={confirmed.length} max={race.maxPlayers} />
      {race.signupDeadline && signup.open && (
        <p className="text-sm text-fg-muted">
          {t.races.signupPanel.deadline(formatDateTime(race.signupDeadline))}
        </p>
      )}

      {mine?.status === "CONFIRMED" && (
        <Alert tone="success" icon={<CheckCircle2 />}>
          <strong>{t.races.signupPanel.confirmedTitle}</strong> {t.races.signupPanel.confirmedBody}
        </Alert>
      )}
      {mine?.status === "WAITLIST" && (
        <Alert tone="warning" icon={<Clock />}>
          <strong>{t.races.signupPanel.waitlistTitle}</strong>{" "}
          {t.races.signupPanel.waitlistBody(waitlist.findIndex((r) => r.id === mine.id) + 1)}
        </Alert>
      )}

      {mine ? (
        canWithdraw(race) && (
          <SignupForm
            raceId={race.id}
            intent="leave"
            leaveWarning={
              mine.status === "CONFIRMED" && waitlist.length > 0
                ? t.races.signupPanel.leaveWarningWaitlist
                : t.races.signupPanel.leaveWarning
            }
          />
        )
      ) : signup.open ? (
        user ? (
          <SignupForm
            raceId={race.id}
            intent="join"
            label={full ? t.races.signupPanel.joinWaitlist : t.races.signupPanel.join}
          />
        ) : (
          <ButtonLink href={`/entrar?volver=/carreras/${race.id}`} size="lg" fullWidth>
            <LogIn /> {t.races.signupPanel.logInToJoin}
          </ButtonLink>
        )
      ) : (
        <Alert tone="info" icon={<Lock />}>
          {t.races.signupPanel.closed[signup.reason]}
        </Alert>
      )}
    </div>
  );
}
