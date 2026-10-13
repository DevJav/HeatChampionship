import type { Metadata } from "next";
import { createCarColor } from "@/actions/catalog";
import { CarColorForm } from "@/components/admin/CarColorForm";
import { EditCard } from "@/components/admin/EditCard";
import { requireAdmin } from "@/lib/session";
import { AdminSuspense } from "@/components/admin/AdminSuspense";

export const metadata: Metadata = { title: "Nuevo color · Admin" };

async function NewColorPageContent() {
  await requireAdmin("/admin/colores/nuevo");
  return (
    <EditCard title="Nuevo color">
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
