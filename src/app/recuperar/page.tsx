import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.passwordReset.title, robots: { index: false } };

/** "Forgot your password?" from the login page: emails a link to the driver's contact address. */
export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title={t.passwordReset.title}
      description={t.passwordReset.description}
      footer={
        <Link href="/entrar" className="font-semibold text-primary hover:underline">
          {t.passwordReset.backToLogin}
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
