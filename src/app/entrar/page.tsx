import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { FormSkeleton } from "@/components/auth/FormSkeleton";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <AuthCard
      title="Entrar"
      description="Accede para inscribirte en las carreras."
      footer={
        <>
          ¿Aún no tienes cuenta?{" "}
          <Link href="/registro" className="font-semibold text-primary hover:underline">
            Regístrate
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
