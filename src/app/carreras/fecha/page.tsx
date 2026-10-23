import type { Metadata } from "next";
import { Suspense } from "react";
import { CalendarClock, ChevronRight, Info, Trash2 } from "lucide-react";
import { deleteDatePoll } from "@/actions/date-polls";
import { Alert, ButtonLink, Card, CardBody, CardHeader, CardTitle, ConfirmButton, Container, EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { AvailabilityCalendar } from "@/components/date-poll/AvailabilityCalendar";
import { BestDays } from "@/components/date-poll/BestDays";
import { CreatePollForm } from "@/components/date-poll/CreatePollForm";
import { PollResponses } from "@/components/date-poll/PollResponses";
import { getDatePoll, type DatePollView } from "@/lib/data/date-polls";
import { listUnfinishedRaces } from "@/lib/data/races";
import { daysBetween, pollMonths } from "@/lib/date-poll";
import { toLocalInput } from "@/lib/dates";
import { formatDayName, formatRaceDate } from "@/lib/format";
import { addMonths, monthOf, monthRange } from "@/lib/month-calendar";
import { raceTitle } from "@/lib/races";
import { getCurrentUser, isAdmin } from "@/lib/session";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.datePoll.title };

/** Admin form: months from this one to half a year ahead, suggesting next month. */
function NewPoll({ today }: { today: string }) {
  const month = monthOf(today);
  const next = addMonths(month, 1);
  return <CreatePollForm months={monthRange(month, addMonths(month, 6))} defaults={{ from: next, to: next }} />;
}

function OpenPoll({ poll, today, me, admin }: { poll: DatePollView; today: string; me: string | null; admin: boolean }) {
  const days = daysBetween(poll.firstDay, poll.lastDay);
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-4">
        {poll.note && <Alert icon={<Info />}>{poll.note}</Alert>}
        <AvailabilityCalendar
          pollId={poll.id}
          poll={poll}
          months={pollMonths(poll)}
          answers={poll.answers}
          drivers={poll.drivers.length}
          today={today}
          me={me}
          admin={admin}
          dayNames={Object.fromEntries(days.map((day) => [day, formatDayName(day)]))}
        />
      </div>
      <aside className="flex flex-col gap-6">
        {admin ? (
          <AdminBestDays poll={poll} today={today} />
        ) : (
          <BestDays poll={poll} today={today} races={null} />
        )}
        <PollResponses poll={poll} />
        {admin && (
          <form action={deleteDatePoll.bind(null, poll.id)} className="self-end">
            <ConfirmButton
              size="sm"
              variant="ghost"
              title={t.datePoll.admin.deleteTitle}
              description={t.datePoll.admin.deleteBody}
              confirmLabel={t.datePoll.admin.delete}
            >
              <Trash2 /> {t.datePoll.admin.delete}
            </ConfirmButton>
          </form>
        )}
      </aside>
    </div>
  );
}

/** Best days with the races "Schedule race" can move. */
async function AdminBestDays({ poll, today }: { poll: DatePollView; today: string }) {
  const races = await listUnfinishedRaces();
  return (
    <BestDays
      poll={poll}
      today={today}
      races={races.map((race) => ({ id: race.id, title: raceTitle(race), when: formatRaceDate(race) }))}
    />
  );
}

/** What the last poll settled on. */
function ClosedPoll({ poll }: { poll: DatePollView }) {
  const race = poll.race;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.datePoll.decided}</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col items-start gap-3">
        <p>{race && race.status !== "DRAFT" ? t.datePoll.decidedBody(raceTitle(race), formatRaceDate(race)) : t.datePoll.decidedPending}</p>
        {race && race.status !== "DRAFT" && (
          <ButtonLink href={`/carreras/${race.id}`} size="sm" variant="secondary">
            {t.datePoll.seeRace} <ChevronRight />
          </ButtonLink>
        )}
      </CardBody>
    </Card>
  );
}

async function DatePollContent() {
  const [poll, user] = await Promise.all([getDatePoll(), getCurrentUser()]);
  const admin = isAdmin(user);
  const today = toLocalInput(new Date()).slice(0, 10);

  if (poll && !poll.closedAt) return <OpenPoll poll={poll} today={today} me={user?.id ?? null} admin={admin} />;
  // Once that race has been run, there's nothing left to announce
  const decided = poll && poll.race?.status !== "FINISHED" ? poll : null;

  return (
    <div className="flex flex-col gap-6">
      {decided ? (
        <ClosedPoll poll={decided} />
      ) : (
        <EmptyState icon={<CalendarClock />} title={t.datePoll.none} description={t.datePoll.noneDescription} />
      )}
      {admin && <NewPoll today={today} />}
    </div>
  );
}

export default function DatePollPage() {
  return (
    <Container>
      <PageHeader title={t.datePoll.title} description={t.datePoll.description} />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <DatePollContent />
      </Suspense>
    </Container>
  );
}
