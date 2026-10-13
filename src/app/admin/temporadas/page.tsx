import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge, ButtonLink, Card, Section, Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { listSeasons } from "@/lib/data/catalog";
import { SEASON_STATUS } from "@/lib/races";
import { requireAdmin } from "@/lib/session";
import { AdminSuspense } from "@/components/admin/AdminSuspense";

export const metadata: Metadata = { title: "Temporadas · Admin" };

async function AdminSeasonsPageContent() {
  await requireAdmin("/admin/temporadas");
  const seasons = await listSeasons();

  return (
    <Section
      title="Temporadas"
      actions={
        <ButtonLink href="/admin/temporadas/nueva" size="sm">
          <Plus /> Nueva temporada
        </ButtonLink>
      }
    >
      <Card>
        <Table>
          <THead>
            <tr>
              <Th>Temporada</Th>
              <Th>Estado</Th>
              <Th>Puntos</Th>
              <Th align="right">Carreras</Th>
            </tr>
          </THead>
          <TBody>
            {seasons.map((season) => (
              <Tr key={season.id}>
                <Td>
                  <Link href={`/admin/temporadas/${season.id}`} className="font-semibold hover:text-primary hover:underline">
                    {season.name}
                  </Link>
                </Td>
                <Td>
                  <Badge tone={SEASON_STATUS[season.status].tone}>{SEASON_STATUS[season.status].label}</Badge>
                </Td>
                <Td className="text-fg-muted">{(season.pointsTable as number[]).join(" · ")}</Td>
                <Td align="right">{season._count.races}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </Card>
    </Section>
  );
}

export default function AdminSeasonsPage() {
  return (
    <AdminSuspense>
      <AdminSeasonsPageContent />
    </AdminSuspense>
  );
}
