import type { Metadata } from "next";
import { createTrack } from "@/actions/catalog";
import { EditCard } from "@/components/admin/EditCard";
import { TrackForm } from "@/components/admin/TrackForm";
import { requireAdmin } from "@/lib/session";
import { AdminSuspense } from "@/components/admin/AdminSuspense";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.admin.pageTitle(t.admin.tracks.new) };

async function NewTrackPageContent() {
  await requireAdmin("/admin/circuitos/nuevo");
  return (
    <EditCard title={t.admin.tracks.new}>
      <TrackForm action={createTrack} />
    </EditCard>
  );
}

export default function NewTrackPage() {
  return (
    <AdminSuspense>
      <NewTrackPageContent />
    </AdminSuspense>
  );
}
