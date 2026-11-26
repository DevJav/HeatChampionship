import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { FormSkeleton } from "@/components/auth/FormSkeleton";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";
import { ButtonLink } from "@/components/ui";
import { resetLinkIsValid } from "@/lib/data/password-reset";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.passwordReset.newTitle, robots: { index: false } };

/** The link in the password reset email: /recuperar/nueva?token=… */
async function NewPassword({ searchParams }: { searchParams: PageProps<"/recuperar/nueva">["searchParams"] }) {
  const { token } = await searchParams;
  if (typeof token !== "string" || !(await resetLinkIsValid(token))) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-sm text-fg-muted">{t.passwordReset.linkExpired}</p>
        <ButtonLink href="/recuperar" variant="secondary">
          {t.passwordReset.requestNew}
        </ButtonLink>
      </div>
    );
  }
  return <NewPasswordForm token={token} />;
}

export default function NewPasswordPage({ searchParams }: PageProps<"/recuperar/nueva">) {
  return (
    <AuthCard title={t.passwordReset.newTitle} description={t.passwordReset.newDescription}>
      <Suspense fallback={<FormSkeleton fields={2} />}>
        <NewPassword searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}
