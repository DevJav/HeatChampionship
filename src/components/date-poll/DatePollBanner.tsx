import { CalendarCheck, ChevronRight } from "lucide-react";
import { getOpenDatePoll } from "@/lib/data/date-polls";
import { getCurrentUser } from "@/lib/session";
import { ButtonLink } from "@/components/ui";
import { t } from "@/i18n";

/**
 * Home page call to the open date poll; nothing when there's none.
 * Reads the DB and session: render inside <Suspense>.
 */
export async function DatePollBanner() {
  const [poll, user] = await Promise.all([getOpenDatePoll(), getCurrentUser()]);
  if (!poll) return null;
  const answered = user != null && poll.respondents.includes(user.id);

  return (
    <section className="flex flex-wrap items-center gap-x-4 gap-y-3 border-l-4 border-accent bg-accent/15 px-4 py-3 clip-chamfer sm:px-5">
      <CalendarCheck aria-hidden className="size-6 shrink-0 text-accent-hover" />
      <div className="min-w-0 flex-1">
        <h2 className="text-xl">{t.datePoll.title}</h2>
        <p className="text-sm text-fg-muted">
          {poll.respondents.length > 0 ? t.datePoll.banner.answered(poll.respondents.length) : t.datePoll.banner.ask}
        </p>
      </div>
      <ButtonLink href="/carreras/fecha" size="sm" variant={answered ? "secondary" : "primary"}>
        {answered ? t.datePoll.banner.see : t.datePoll.banner.answer} <ChevronRight />
      </ButtonLink>
    </section>
  );
}
