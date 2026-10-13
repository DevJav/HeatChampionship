import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { ButtonLink, Card, EmptyState, Section, Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { RaceStatusBadge } from "@/components/domain/RaceStatusBadge";
import { listAllRaces } from "@/lib/data/races";
import { formatDateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { AdminSuspense } from "@/components/admin/AdminSuspense";

export const metadata: Metadata = { title: "Carreras · Admin" };

async function AdminRacesPageContent() {
  await requireAdmin("/admin/carreras");
  const races = await listAllRaces();

  return (
    <Section
      title="Carreras"
      actions={
        <ButtonLink href="/admin/carreras/nueva" size="sm">
          <Plus /> Nueva carrera
        </ButtonLink>
      }
    >
      {races.length === 0 ? (
        <EmptyState icon={<CalendarDays />} title="Sin carreras" description="Crea la primera carrera de la temporada." />
      ) : (
        <Card>
          <Table>
            <THead>
              <tr>
                <Th>Carrera</Th>
                <Th>Temporada</Th>
                <Th>Fecha</Th>
                <Th>Estado</Th>
                <Th align="right">Inscritos</Th>
              </tr>
            </THead>
            <TBody>
              {races.map((race) => (
                <Tr key={race.id}>
                  <Td>
                    <Link href={`/admin/carreras/${race.id}`} className="font-semibold hover:text-primary hover:underline">
                      Ronda {race.round} · {race.track.name}
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
