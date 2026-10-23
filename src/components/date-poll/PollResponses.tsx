import type { DatePollView } from "@/lib/data/date-polls";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { DriverName } from "@/components/domain/DriverName";
import { t } from "@/i18n";

/** Who has answered (and for how many days) and who hasn't yet. */
export function PollResponses({ poll }: { poll: DatePollView }) {
  const counts = Map.groupBy(
    poll.answers.filter((a) => !poll.blockedDays.includes(a.day)),
    (a) => a.userId,
  );
  const answered = poll.drivers.filter((d) => counts.has(d.id));
  const pending = poll.drivers.filter((d) => !counts.has(d.id));

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t.datePoll.responses}</CardTitle>
          <CardDescription>{t.datePoll.responded(answered.length, poll.drivers.length)}</CardDescription>
        </div>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        {answered.length > 0 && (
          <ul className="flex flex-col gap-2">
            {answered.map((driver) => (
              <li key={driver.id} className="flex items-center justify-between gap-2">
                <DriverName name={driver.name} color={driver.favoriteColor?.hex} username={driver.username} />
                <span className="shrink-0 text-sm text-fg-muted tabular-nums">{t.datePoll.daysAnswered(counts.get(driver.id)!.length)}</span>
              </li>
            ))}
          </ul>
        )}
        {pending.length > 0 && (
          <div className="flex flex-col gap-2">
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-fg-muted not-italic">{t.datePoll.pending}</h4>
            <ul className="flex flex-col gap-2 opacity-70">
              {pending.map((driver) => (
                <li key={driver.id}>
                  <DriverName name={driver.name} color={driver.favoriteColor?.hex} username={driver.username} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
