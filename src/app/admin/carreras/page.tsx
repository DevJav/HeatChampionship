import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { ButtonLink, Card, EmptyState, Section, Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { RaceStatusBadge } from "@/components/domain/RaceStatusBadge";
import { listAllRaces } from "@/lib/data/races";
import { formatDateTime } from "@/lib/format";
import { raceTitle } from "@/lib/races";
import { requireAdmin } from "@/lib/session";
import { AdminSuspense } from "@/components/admin/AdminSuspense";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.admin.pageTitle(t.admin.racesAdmin.title) };

async function AdminRacesPageContent() {
  await requireAdmin("/admin/carreras");
  const races = await listAllRaces();

  return (
    <Section
      title={t.admin.racesAdmin.title}
      actions={
        <ButtonLink href="/admin/carreras/nueva" size="sm">
          <Plus /> {t.admin.racesAdmin.new}
        </ButtonLink>
      }
    >
      {races.length === 0 ? (
        <EmptyState icon={<CalendarDays />} title={t.admin.racesAdmin.empty} description={t.admin.racesAdmin.emptyDescription} />
      ) : (
        <Card>
          <Table>
            <THead>
              <tr>
                <Th>{t.admin.racesAdmin.race}</Th>
                <Th>{t.admin.racesAdmin.season}</Th>
                <Th>{t.admin.racesAdmin.date}</Th>
                <Th>{t.admin.status}</Th>
                <Th align="right">{t.admin.racesAdmin.entrants}</Th>
              </tr>
            </THead>
            <TBody>
              {races.map((race) => (
                <Tr key={race.id}>
                  <Td>
                    <Link href={`/admin/carreras/${race.id}`} className="font-semibold hover:text-primary hover:underline">
                      {raceTitle(race)}
                    </Link>
                  </Td>
                  <Td className="text-fg-muted">{race.season.name}</Td>
                  <Td className="text-fg-muted">{formatDateTime(race.scheduledAt)}</Td>
                  <Td>
                    <RaceStatusBadge race={race} />
                  </Td>
                  <Td align="right">
                    {race._count.registrations}/{race.maxPlayers}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </Card>
      )}
    </Section>
  );
}

export default function AdminRacesPage() {
  return (
    <AdminSuspense>
      <AdminRacesPageContent />
    </AdminSuspense>
  );
}
