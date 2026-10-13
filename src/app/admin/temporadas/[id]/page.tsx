import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { deleteSeason, updateSeason } from "@/actions/seasons";
import { DeleteForm } from "@/components/admin/DeleteForm";
import { EditCard } from "@/components/admin/EditCard";
import { SeasonForm } from "@/components/admin/SeasonForm";
import { getSeason } from "@/lib/data/catalog";
import { requireAdmin } from "@/lib/session";
import { AdminSuspense } from "@/components/admin/AdminSuspense";

export const metadata: Metadata = { title: "Editar temporada · Admin" };

async function EditSeasonPageContent({ params }: PageProps<"/admin/temporadas/[id]">) {
  const { id } = await params;
  await requireAdmin(`/admin/temporadas/${id}`);
  const season = await getSeason(id);
  if (!season) notFound();

  return (
    <EditCard
      title={season.name}
      actions={
        season._count.races === 0 && (
          <DeleteForm action={deleteSeason.bind(null, id)} title="¿Eliminar la temporada?" />
        )
      }
    >
      <SeasonForm action={updateSeason.bind(null, id)} season={season} />
    </EditCard>
  );
}

export default function EditSeasonPage(props: PageProps<"/admin/temporadas/[id]">) {
  return (
    <AdminSuspense>
      <EditSeasonPageContent {...props} />
    </AdminSuspense>
  );
}
