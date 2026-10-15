import type { Metadata } from "next";
import { CalendarDays, Home } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { StatusPage } from "@/components/layout/StatusPage";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.errors.notFoundTitle };

export default function NotFound() {
  return (
    <StatusPage
      code="404"
      title={t.errors.notFoundHeading}
      description={t.errors.notFoundDescription}
      actions={
        <>
          <ButtonLink href="/" variant="accent">
            <Home /> {t.errors.backHome}
          </ButtonLink>
          <ButtonLink href="/carreras" variant="inverse">
            <CalendarDays /> {t.errors.viewRaces}
          </ButtonLink>
        </>
      }
    />
  );
}
