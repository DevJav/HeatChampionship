import type { Metadata } from "next";
import { createTrack } from "@/actions/catalog";
import { EditCard } from "@/components/admin/EditCard";
import { TrackForm } from "@/components/admin/TrackForm";
import { requireAdmin } from "@/lib/session";
import { AdminSuspense } from "@/components/admin/AdminSuspense";

export const metadata: Metadata = { title: "Nuevo circuito · Admin" };

async function NewTrackPageContent() {
  await requireAdmin("/admin/circuitos/nuevo");
  return (
    <EditCard title="Nuevo circuito">
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
