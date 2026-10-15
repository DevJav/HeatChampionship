import type { Metadata } from "next";
import { createUpgrade } from "@/actions/catalog";
import { EditCard } from "@/components/admin/EditCard";
import { UpgradeForm } from "@/components/admin/UpgradeForm";
import { requireAdmin } from "@/lib/session";
import { AdminSuspense } from "@/components/admin/AdminSuspense";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.admin.pageTitle(t.admin.upgrades.new) };

async function NewUpgradePageContent() {
  await requireAdmin("/admin/mejoras/nueva");
  return (
    <EditCard title={t.admin.upgrades.new}>
      <UpgradeForm action={createUpgrade} />
    </EditCard>
  );
}

export default function NewUpgradePage() {
  return (
    <AdminSuspense>
      <NewUpgradePageContent />
    </AdminSuspense>
  );
}
