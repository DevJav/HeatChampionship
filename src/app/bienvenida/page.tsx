import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { FormSkeleton } from "@/components/auth/FormSkeleton";
import { ProfileSetupForm } from "@/components/players/ProfileSetupForm";
import { listCarColors } from "@/lib/data/catalog";
import { getEditableProfile } from "@/lib/data/players";
import { requireUser } from "@/lib/session";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.auth.welcome.title };

async function ProfileSetup() {
  const user = await requireUser("/bienvenida");
  const [profile, colors] = await Promise.all([getEditableProfile(user.id), listCarColors()]);
  const activeColors = colors
    .filter((c) => c.active || c.id === profile.favoriteColorId)
    .map(({ id, name, hex }) => ({ id, name, hex }));

  return <ProfileSetupForm profile={profile} colors={activeColors} />;
}

export default function WelcomePage() {
  return (
    <AuthCard
      title={t.auth.welcome.heading}
      description={t.auth.welcome.description}
      footer={
        <>
          {t.auth.welcome.changeLater}{" "}
          <Link href="/perfil" className="font-semibold text-primary hover:underline">
            {t.profile.title}
          </Link>
        </>
      }
    >
      <Suspense fallback={<FormSkeleton fields={3} />}>
        <ProfileSetup />
      </Suspense>
    </AuthCard>
  );
}
