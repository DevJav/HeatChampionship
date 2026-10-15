import type { Metadata } from "next";
import { createCarColor } from "@/actions/catalog";
import { CarColorForm } from "@/components/admin/CarColorForm";
import { EditCard } from "@/components/admin/EditCard";
import { requireAdmin } from "@/lib/session";
import { AdminSuspense } from "@/components/admin/AdminSuspense";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.admin.pageTitle(t.admin.colors.new) };

async function NewColorPageContent() {
  await requireAdmin("/admin/colores/nuevo");
  return (
    <EditCard title={t.admin.colors.new}>
      <CarColorForm action={createCarColor} />
    </EditCard>
  );
}

export default function NewColorPage() {
  return (
    <AdminSuspense>
      <NewColorPageContent />
    </AdminSuspense>
  );
}
