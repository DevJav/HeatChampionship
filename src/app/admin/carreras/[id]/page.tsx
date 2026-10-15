import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink, Flag, X } from "lucide-react";
import { addEntrant, deleteRace, removeEntrant, updateRace } from "@/actions/races";
import {
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { RaceStatusBadge } from "@/components/domain/RaceStatusBadge";
import { AddEntrantForm } from "@/components/admin/AddEntrantForm";
import { DeleteForm } from "@/components/admin/DeleteForm";
import { RaceForm } from "@/components/admin/RaceForm";
import { EntryList } from "@/components/races/EntryList";
import { listSeasons, listTracks } from "@/lib/data/catalog";
import { getRace } from "@/lib/data/races";
import { listUsers } from "@/lib/data/users";
import { raceTitle } from "@/lib/races";
import { requireAdmin } from "@/lib/session";
import { AdminSuspense } from "@/components/admin/AdminSuspense";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.admin.pageTitle(t.admin.racesAdmin.edit) };

async function EditRacePageContent({ params }: PageProps<"/admin/carreras/[id]">) {
  const { id } = await params;
  await requireAdmin(`/admin/carreras/${id}`);

  const [race, seasons, tracks, users] = await Promise.all([
    getRace(id, { includeDraft: true }),
    listSeasons(),
    listTracks(),
    listUsers(),
  ]);
  if (!race) notFound();

  const entered = new Set(race.registrations.map((r) => r.user.id));
  const available = users.filter((user) => !entered.has(user.id));
  // Keep the race's own track selectable even if it was deactivated
  const trackOptions = tracks.filter((track) => track.active || track.id === race.trackId);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl">{raceTitle(race)}</h2>
          <RaceStatusBadge race={race} />
        </div>
        <div className="flex gap-2">
          <ButtonLink href={`/carreras/${race.id}`} variant="secondary" size="sm">
            <ExternalLink /> {t.admin.racesAdmin.viewPage}
          </ButtonLink>
          <ButtonLink href={`/admin/carreras/${race.id}/resultados`} size="sm">
            <Flag /> {race.status === "FINISHED" ? t.races.editResults : t.races.results}
          </ButtonLink>
        </div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>{t.admin.racesAdmin.details}</CardTitle>
          </CardHeader>
          <CardBody>
            <RaceForm action={updateRace.bind(null, race.id)} seasons={seasons} tracks={trackOptions} race={race} />
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>{t.admin.racesAdmin.entrants}</CardTitle>
              <CardDescription>{t.admin.racesAdmin.entrantsDescription}</CardDescription>
            </div>
          </CardHeader>
          <CardBody className="flex flex-col gap-6">
            <EntryList
              entrants={race.registrations}
              maxPlayers={race.maxPlayers}
              rowAction={(entrant) => (
                <form action={removeEntrant.bind(null, race.id, entrant.user.id)}>
                  <Button type="submit" variant="ghost" size="icon" aria-label={t.admin.racesAdmin.removeDriver(entrant.user.name)} title={t.admin.racesAdmin.remove}>
                    <X />
                  </Button>
                </form>
              )}
            />
            <AddEntrantForm action={addEntrant.bind(null, race.id)} players={available} />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.admin.racesAdmin.dangerZone}</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-fg-muted">{t.admin.racesAdmin.dangerDescription}</p>
          <DeleteForm
            action={deleteRace.bind(null, race.id)}
            title={t.admin.racesAdmin.deleteTitle}
            description={t.admin.racesAdmin.deleteDescription(raceTitle(race))}
          />
        </CardBody>
      </Card>
    </div>
  );
}

export default function EditRacePage(props: PageProps<"/admin/carreras/[id]">) {
  return (
    <AdminSuspense>
      <EditRacePageContent {...props} />
    </AdminSuspense>
  );
}
