import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { deleteCarColor, updateCarColor } from "@/actions/catalog";
import { CarColorForm } from "@/components/admin/CarColorForm";
import { DeleteForm } from "@/components/admin/DeleteForm";
import { EditCard } from "@/components/admin/EditCard";
import { getCarColor } from "@/lib/data/catalog";
import { requireAdmin } from "@/lib/session";
import { AdminSuspense } from "@/components/admin/AdminSuspense";

export const metadata: Metadata = { title: "Editar color · Admin" };

async function EditColorPageContent({ params }: PageProps<"/admin/colores/[id]">) {
  const { id } = await params;
  await requireAdmin(`/admin/colores/${id}`);
  const color = await getCarColor(id);
  if (!color) notFound();

  return (
    <EditCard
      title={color.name}
      actions={
        color._count.results === 0 && <DeleteForm action={deleteCarColor.bind(null, id)} title="¿Eliminar el color?" />
      }
    >
      <CarColorForm action={updateCarColor.bind(null, id)} color={color} />
    </EditCard>
  );
}

export default function EditColorPage(props: PageProps<"/admin/colores/[id]">) {
  return (
    <AdminSuspense>
      <EditColorPageContent {...props} />
    </AdminSuspense>
  );
}
