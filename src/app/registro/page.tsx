import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Lock } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { FormSkeleton } from "@/components/auth/FormSkeleton";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { Alert } from "@/components/ui";
import { getSettings } from "@/lib/data/settings";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.auth.signUp };

async function RegistrationGate() {
  const { registrationOpen } = await getSettings();
  if (!registrationOpen) {
    return (
      <Alert tone="warning" icon={<Lock />}>
        {t.auth.registrationClosedNotice}
      </Alert>
    );
  }
  return <SignUpForm />;
}

export default function SignUpPage() {
  return (
    <AuthCard
      title={t.auth.signUp}
      description={t.auth.signUpDescription}
      footer={
        <>
          {t.auth.haveAccount}{" "}
          <Link href="/entrar" className="font-semibold text-primary hover:underline">
            {t.auth.logInLink}
          </Link>
        </>
      }
    >
      <Suspense fallback={<FormSkeleton fields={4} />}>
        <RegistrationGate />
      </Suspense>
    </AuthCard>
  );
}
