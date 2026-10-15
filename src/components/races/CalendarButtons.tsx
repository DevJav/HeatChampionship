import { CalendarPlus } from "lucide-react";
import { buttonVariants } from "@/components/ui";
import { t } from "@/i18n";

type CalendarButtonsProps = {
  /** Path of the race's .ics route */
  icsHref: string;
  googleHref: string;
  variant?: "inverse" | "secondary";
};

// Plain <a>: a file download and an external site, not app navigation

/** "Add to calendar": the .ics file (Apple, Outlook, Android) or Google Calendar. */
export function CalendarButtons({ icsHref, googleHref, variant = "inverse" }: CalendarButtonsProps) {
  return (
    <>
      <a href={icsHref} className={buttonVariants({ variant, size: "sm" })}>
        <CalendarPlus /> {t.races.share.addToCalendar}
      </a>
      <a href={googleHref} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant, size: "sm" })}>
        Google Calendar
      </a>
    </>
  );
}
