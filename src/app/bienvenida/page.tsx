import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { FormSkeleton } from "@/components/auth/FormSkeleton";
import { ProfileSetupForm } from "@/components/players/ProfileSetupForm";
import { listCarColors } from "@/lib/data/catalog";
import { getEditableProfile } from "@/lib/data/players";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Bienvenida" };

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
      title="Ya estás en la parrilla"
      description="Dale un toque a tu perfil para que el resto de pilotos te reconozca. Todo es opcional."
      footer={
        <>
          Puedes cambiarlo cuando quieras en{" "}
          <Link href="/perfil" className="font-semibold text-primary hover:underline">
            Mi perfil
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
