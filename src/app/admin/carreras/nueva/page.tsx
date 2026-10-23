import type { Metadata } from "next";
import { Flag } from "lucide-react";
import { createRace } from "@/actions/races";
import { ButtonLink, Card, CardBody, CardHeader, CardTitle, EmptyState } from "@/components/ui";
import { RaceForm } from "@/components/admin/RaceForm";
import { getCurrentSeason, listSeasons, listTracks } from "@/lib/data/catalog";
import { lastRaceTime, nextRoundNumber } from "@/lib/data/races";
import { requireAdmin } from "@/lib/session";
import { AdminSuspense } from "@/components/admin/AdminSuspense";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.admin.pageTitle(t.admin.racesAdmin.new) };

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Time used for a day picked in a date poll when there's no earlier race to copy */
const FALLBACK_TIME = "18:00";

async function NewRacePageContent({ searchParams }: { searchParams: PageProps<"/admin/carreras/nueva">["searchParams"] }) {
  await requireAdmin("/admin/carreras/nueva");
  // ?dia=2026-11-14&encuesta=<poll id>: scheduling the day a date poll picked
  const { dia, encuesta } = await searchParams;
  const day = typeof dia === "string" && DAY_PATTERN.test(dia) ? dia : undefined;
  const [seasons, tracks, current, time] = await Promise.all([
    listSeasons(),
    listTracks({ activeOnly: true }),
    getCurrentSeason(),
    day ? lastRaceTime() : null,
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
          defaults={{
            seasonId: current?.id,
            round,
            scheduledAt: day && `${day}T${time ?? FALLBACK_TIME}`,
            datePollId: typeof encuesta === "string" ? encuesta : undefined,
          }}
        />
      </CardBody>
    </Card>
  );
}

export default function NewRacePage({ searchParams }: PageProps<"/admin/carreras/nueva">) {
  return (
    <AdminSuspense>
      <NewRacePageContent searchParams={searchParams} />
    </AdminSuspense>
  );
}
