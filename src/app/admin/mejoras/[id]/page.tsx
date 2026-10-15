import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { deleteUpgrade, updateUpgrade } from "@/actions/catalog";
import { DeleteForm } from "@/components/admin/DeleteForm";
import { EditCard } from "@/components/admin/EditCard";
import { UpgradeForm } from "@/components/admin/UpgradeForm";
import { getUpgrade } from "@/lib/data/catalog";
import { requireAdmin } from "@/lib/session";
import { AdminSuspense } from "@/components/admin/AdminSuspense";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.admin.pageTitle(t.admin.upgrades.edit) };

async function EditUpgradePageContent({ params }: PageProps<"/admin/mejoras/[id]">) {
  const { id } = await params;
  await requireAdmin(`/admin/mejoras/${id}`);
  const upgrade = await getUpgrade(id);
  if (!upgrade) notFound();

  return (
    <EditCard
      title={upgrade.name}
      actions={
        upgrade._count.results === 0 && <DeleteForm action={deleteUpgrade.bind(null, id)} title={t.admin.upgrades.deleteTitle} />
      }
    >
      <UpgradeForm action={updateUpgrade.bind(null, id)} upgrade={upgrade} />
    </EditCard>
  );
}

export default function EditUpgradePage(props: PageProps<"/admin/mejoras/[id]">) {
  return (
    <AdminSuspense>
      <EditUpgradePageContent {...props} />
    </AdminSuspense>
  );
}
