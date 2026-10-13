import type { Metadata } from "next";
import Link from "next/link";
import { Lock, LockOpen } from "lucide-react";
import { updateRegistrationOpen } from "@/actions/admin";
import { Badge, Card, CardBody, CardDescription, CardHeader, CardTitle, SubmitButton } from "@/components/ui";
import { getSettings } from "@/lib/data/settings";
import { requireAdmin } from "@/lib/session";
import { AdminSuspense } from "@/components/admin/AdminSuspense";

export const metadata: Metadata = { title: "Administración" };

async function RegistrationSettings() {
  const { registrationOpen } = await getSettings();

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Registro de pilotos</CardTitle>
          <CardDescription>Controla si se pueden crear cuentas nuevas.</CardDescription>
        </div>
        <Badge tone={registrationOpen ? "success" : "danger"}>
          {registrationOpen ? "Abierto" : "Cerrado"}
        </Badge>
      </CardHeader>
      <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-fg-muted">
          {registrationOpen
            ? "Cualquiera con el enlace puede registrarse. Ciérralo cuando estén todos tus amigos."
            : "Nadie puede registrarse. Ábrelo para que se unan nuevos pilotos."}
        </p>
        <form action={updateRegistrationOpen}>
          <input type="hidden" name="open" value={String(!registrationOpen)} />
          <SubmitButton variant={registrationOpen ? "secondary" : "primary"}>
            {registrationOpen ? <Lock /> : <LockOpen />}
            {registrationOpen ? "Cerrar registro" : "Abrir registro"}
          </SubmitButton>
        </form>
      </CardBody>
    </Card>
  );
}

async function AdminPageContent() {
  await requireAdmin("/admin");

  return (
    <div className="flex flex-col gap-10">
      <RegistrationSettings />
      <p className="text-sm text-fg-muted">
        Para cambiar contraseñas, nombres o roles de los pilotos, ve a la pestaña{" "}
        <Link href="/admin/pilotos" className="font-semibold text-fg hover:text-primary hover:underline">
          Pilotos
        </Link>
        .
      </p>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminSuspense>
      <AdminPageContent />
    </AdminSuspense>
  );
}
