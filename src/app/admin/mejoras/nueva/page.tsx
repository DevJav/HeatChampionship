import type { Metadata } from "next";
import { createUpgrade } from "@/actions/catalog";
import { EditCard } from "@/components/admin/EditCard";
import { UpgradeForm } from "@/components/admin/UpgradeForm";
import { requireAdmin } from "@/lib/session";
import { AdminSuspense } from "@/components/admin/AdminSuspense";

export const metadata: Metadata = { title: "Nueva mejora · Admin" };

async function NewUpgradePageContent() {
  await requireAdmin("/admin/mejoras/nueva");
  return (
    <EditCard title="Nueva mejora">
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
