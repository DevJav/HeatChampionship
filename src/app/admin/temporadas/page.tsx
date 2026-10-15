import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge, ButtonLink, Card, Section, Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { listSeasons } from "@/lib/data/catalog";
import { SEASON_STATUS } from "@/lib/races";
import { requireAdmin } from "@/lib/session";
import { AdminSuspense } from "@/components/admin/AdminSuspense";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.admin.pageTitle(t.admin.seasons.title) };

async function AdminSeasonsPageContent() {
  await requireAdmin("/admin/temporadas");
  const seasons = await listSeasons();

  return (
    <Section
      title={t.admin.seasons.title}
      actions={
        <ButtonLink href="/admin/temporadas/nueva" size="sm">
          <Plus /> {t.admin.seasons.new}
        </ButtonLink>
      }
    >
      <Card>
        <Table>
          <THead>
            <tr>
              <Th>{t.admin.seasons.season}</Th>
              <Th>{t.admin.status}</Th>
              <Th>{t.admin.seasons.points}</Th>
              <Th align="right">{t.admin.races}</Th>
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
