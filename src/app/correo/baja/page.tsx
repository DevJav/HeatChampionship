import type { Metadata } from "next";
import { Suspense } from "react";
import { unsubscribeWithToken } from "@/actions/email";
import { AuthCard } from "@/components/auth/AuthCard";
import { ButtonLink, Skeleton, SubmitButton } from "@/components/ui";
import { addressForToken } from "@/lib/email/send";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.email.unsubscribeTitle, robots: { index: false } };

/** Linked from the footer of every email. Asks first, so link scanners can't unsubscribe anyone. */
async function Unsubscribe({ searchParams }: { searchParams: PageProps<"/correo/baja">["searchParams"] }) {
  const { token, hecho } = await searchParams;
  const profileLink = (
    <ButtonLink href="/perfil#correo" variant="secondary">
      {t.email.managePreferences}
    </ButtonLink>
  );

  if (hecho) {
    return (
      <div className="flex flex-col items-start gap-4">
        <h2 className="text-xl">{t.email.unsubscribedTitle}</h2>
        <p className="text-sm text-fg-muted">{t.email.unsubscribedDescription}</p>
        {profileLink}
      </div>
    );
  }

  const address = typeof token === "string" ? await addressForToken(token) : null;
  if (!address) {
    return (
      <div className="flex flex-col items-start gap-4">
        <h2 className="text-xl">{t.email.badLinkTitle}</h2>
        <p className="text-sm text-fg-muted">{t.email.badLinkDescription}</p>
        {profileLink}
      </div>
    );
  }

  return (
    <form action={unsubscribeWithToken.bind(null, token as string)} className="flex flex-col items-start gap-4">
      <p className="text-sm text-fg-muted">{t.email.unsubscribeDescription(address)}</p>
      <SubmitButton>{t.email.unsubscribeConfirm}</SubmitButton>
    </form>
  );
}

export default function UnsubscribePage({ searchParams }: PageProps<"/correo/baja">) {
  return (
    <AuthCard title={t.email.unsubscribeTitle}>
      <Suspense fallback={<Skeleton className="h-24 w-full" />}>
        <Unsubscribe searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}
