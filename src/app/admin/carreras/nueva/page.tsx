import type { Metadata } from "next";
import { Flag } from "lucide-react";
import { createRace } from "@/actions/races";
import { ButtonLink, Card, CardBody, CardHeader, CardTitle, EmptyState } from "@/components/ui";
import { RaceForm } from "@/components/admin/RaceForm";
import { getCurrentSeason, listSeasons, listTracks } from "@/lib/data/catalog";
import { nextRoundNumber } from "@/lib/data/races";
import { requireAdmin } from "@/lib/session";
import { AdminSuspense } from "@/components/admin/AdminSuspense";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.admin.pageTitle(t.admin.racesAdmin.new) };

async function NewRacePageContent() {
  await requireAdmin("/admin/carreras/nueva");
  const [seasons, tracks, current] = await Promise.all([
    listSeasons(),
    listTracks({ activeOnly: true }),
    getCurrentSeason(),
  ]);

  if (seasons.length === 0 || tracks.length === 0) {
    return (
      <EmptyState
        icon={<Flag />}
        title={t.admin.racesAdmin.missingData}
        description={t.admin.racesAdmin.missingDataDescription}
        action={<ButtonLink href={seasons.length === 0 ? "/admin/temporadas/nueva" : "/admin/circuitos/nuevo"}>{t.admin.racesAdmin.createMissing}</ButtonLink>}
      />
    );
  }

  const round = current ? await nextRoundNumber(current.id) : 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.admin.racesAdmin.new}</CardTitle>
      </CardHeader>
      <CardBody>
        <RaceForm
          action={createRace}
          seasons={seasons}
          tracks={tracks}
          defaults={{ seasonId: current?.id, round }}
        />
      </CardBody>
    </Card>
  );
}

export default function NewRacePage() {
  return (
    <AdminSuspense>
      <NewRacePageContent />
    </AdminSuspense>
  );
}
