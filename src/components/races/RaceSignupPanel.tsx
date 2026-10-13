import { CheckCircle2, Clock, Lock, LogIn } from "lucide-react";
import type { RaceDetail } from "@/lib/data/races";
import { formatDateTime } from "@/lib/format";
import { canWithdraw, SIGNUP_CLOSED_MESSAGES, signupWindow } from "@/lib/registration-rules";
import { getCurrentUser } from "@/lib/session";
import { Alert, ButtonLink } from "@/components/ui";
import { SeatsMeter } from "@/components/domain/SeatsMeter";
import { SignupForm } from "./SignupForm";

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
          Inscripción hasta el {formatDateTime(race.signupDeadline)}
        </p>
      )}

      {mine?.status === "CONFIRMED" && (
        <Alert tone="success" icon={<CheckCircle2 />}>
          <strong>Tienes plaza.</strong> ¡Nos vemos en la parrilla!
        </Alert>
      )}
      {mine?.status === "WAITLIST" && (
        <Alert tone="warning" icon={<Clock />}>
          <strong>Estás en lista de espera</strong> (posición {waitlist.findIndex((r) => r.id === mine.id) + 1}).
          Si alguien se retira, entras automáticamente.
        </Alert>
      )}

      {mine ? (
        canWithdraw(race) && (
          <SignupForm
            raceId={race.id}
            intent="leave"
            leaveWarning={
              mine.status === "CONFIRMED" && waitlist.length > 0
                ? "Tu plaza pasará al primero de la lista de espera. Si vuelves a inscribirte, irás al final de la cola."
                : "Si vuelves a inscribirte, irás al final de la cola."
            }
          />
        )
      ) : signup.open ? (
        user ? (
          <SignupForm
            raceId={race.id}
            intent="join"
            label={full ? "Apuntarme a la lista de espera" : "Inscribirme"}
          />
        ) : (
          <ButtonLink href={`/entrar?volver=/carreras/${race.id}`} size="lg" fullWidth>
            <LogIn /> Entra para inscribirte
          </ButtonLink>
        )
      ) : (
        <Alert tone="info" icon={<Lock />}>
          {SIGNUP_CLOSED_MESSAGES[signup.reason]}
        </Alert>
      )}
    </div>
  );
}
