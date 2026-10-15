import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { deleteTrack, updateTrack } from "@/actions/catalog";
import { DeleteForm } from "@/components/admin/DeleteForm";
import { EditCard } from "@/components/admin/EditCard";
import { TrackForm } from "@/components/admin/TrackForm";
import { getTrack } from "@/lib/data/catalog";
import { requireAdmin } from "@/lib/session";
import { AdminSuspense } from "@/components/admin/AdminSuspense";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.admin.pageTitle(t.admin.tracks.edit) };

async function EditTrackPageContent({ params }: PageProps<"/admin/circuitos/[id]">) {
  const { id } = await params;
  await requireAdmin(`/admin/circuitos/${id}`);
  const track = await getTrack(id);
  if (!track) notFound();

  return (
    <EditCard
      title={track.name}
      actions={
        track._count.races === 0 && <DeleteForm action={deleteTrack.bind(null, id)} title={t.admin.tracks.deleteTitle} />
      }
    >
      <TrackForm action={updateTrack.bind(null, id)} track={track} />
    </EditCard>
  );
}

export default function EditTrackPage(props: PageProps<"/admin/circuitos/[id]">) {
  return (
    <AdminSuspense>
      <EditTrackPageContent {...props} />
    </AdminSuspense>
  );
}
