import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { FormSkeleton } from "@/components/auth/FormSkeleton";
import { LoginForm } from "@/components/auth/LoginForm";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.auth.logIn };

export default function LoginPage() {
  return (
    <AuthCard
      title={t.auth.logIn}
      description={t.auth.logInDescription}
      footer={
        <>
          {t.auth.noAccount}{" "}
          <Link href="/registro" className="font-semibold text-primary hover:underline">
            {t.auth.signUpLink}
          </Link>
        </>
      }
    >
      {/* LoginForm reads ?volver= from the URL */}
      <Suspense fallback={<FormSkeleton fields={2} />}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
