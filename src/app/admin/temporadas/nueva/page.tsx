import type { Metadata } from "next";
import { createSeason } from "@/actions/seasons";
import { EditCard } from "@/components/admin/EditCard";
import { SeasonForm } from "@/components/admin/SeasonForm";
import { requireAdmin } from "@/lib/session";
import { AdminSuspense } from "@/components/admin/AdminSuspense";

export const metadata: Metadata = { title: "Nueva temporada · Admin" };

async function NewSeasonPageContent() {
  await requireAdmin("/admin/temporadas/nueva");
  return (
    <EditCard title="Nueva temporada">
      <SeasonForm action={createSeason} />
    </EditCard>
  );
}

export default function NewSeasonPage() {
  return (
    <AdminSuspense>
      <NewSeasonPageContent />
    </AdminSuspense>
  );
}
