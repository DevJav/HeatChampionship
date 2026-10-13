import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Lock } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { FormSkeleton } from "@/components/auth/FormSkeleton";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { Alert } from "@/components/ui";
import { getSettings } from "@/lib/data/settings";

export const metadata: Metadata = { title: "Registro" };

async function RegistrationGate() {
  const { registrationOpen } = await getSettings();
  if (!registrationOpen) {
    return (
      <Alert tone="warning" icon={<Lock />}>
        El registro de nuevos pilotos está cerrado. Pide al organizador que lo abra.
      </Alert>
    );
  }
  return <SignUpForm />;
}

export default function SignUpPage() {
  return (
    <AuthCard
      title="Registro"
      description="Crea tu cuenta de piloto."
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link href="/entrar" className="font-semibold text-primary hover:underline">
            Entra
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
