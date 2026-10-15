import type { Metadata } from "next";
import Link from "next/link";
import { Lock, LockOpen } from "lucide-react";
import { updateRegistrationOpen } from "@/actions/admin";
import { Badge, Card, CardBody, CardDescription, CardHeader, CardTitle, SubmitButton } from "@/components/ui";
import { getSettings } from "@/lib/data/settings";
import { requireAdmin } from "@/lib/session";
import { AdminSuspense } from "@/components/admin/AdminSuspense";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.admin.title };

async function RegistrationSettings() {
  const { registrationOpen } = await getSettings();

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t.admin.registration.title}</CardTitle>
          <CardDescription>{t.admin.registration.description}</CardDescription>
        </div>
        <Badge tone={registrationOpen ? "success" : "danger"}>
          {registrationOpen ? t.admin.registration.open : t.admin.registration.closed}
        </Badge>
      </CardHeader>
      <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-fg-muted">
          {registrationOpen
            ? t.admin.registration.openHint
            : t.admin.registration.closedHint}
        </p>
        <form action={updateRegistrationOpen}>
          <input type="hidden" name="open" value={String(!registrationOpen)} />
          <SubmitButton variant={registrationOpen ? "secondary" : "primary"}>
            {registrationOpen ? <Lock /> : <LockOpen />}
            {registrationOpen ? t.admin.registration.close : t.admin.registration.reopen}
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
        {t.admin.driversHint}{" "}
        <Link href="/admin/pilotos" className="font-semibold text-fg hover:text-primary hover:underline">
          {t.admin.tabs.drivers}
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
