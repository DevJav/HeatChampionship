"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { Home, RotateCcw } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui";
import { StatusPage } from "@/components/layout/StatusPage";
import { t } from "@/i18n";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      code="!"
      title={t.errors.errorHeading}
      description={t.errors.errorDescription}
      actions={
        <>
          <Button variant="accent" onClick={() => retry()}>
            <RotateCcw /> {t.errors.retry}
          </Button>
          <ButtonLink href="/" variant="inverse">
            <Home /> {t.errors.backHome}
          </ButtonLink>
        </>
      }
      footnote={error.digest && t.errors.reference(error.digest)}
    />
  );
}
