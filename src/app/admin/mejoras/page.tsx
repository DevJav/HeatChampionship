import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Wrench } from "lucide-react";
import { Badge, ButtonLink, Card, EmptyState, Section, Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { listUpgrades } from "@/lib/data/catalog";
import { requireAdmin } from "@/lib/session";
import { AdminSuspense } from "@/components/admin/AdminSuspense";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.admin.pageTitle(t.admin.upgrades.title) };

async function AdminUpgradesPageContent() {
  await requireAdmin("/admin/mejoras");
  const upgrades = await listUpgrades();

  return (
    <Section
      title={t.admin.upgrades.title}
      actions={
        <ButtonLink href="/admin/mejoras/nueva" size="sm">
          <Plus /> {t.admin.upgrades.new}
        </ButtonLink>
      }
    >
      {upgrades.length === 0 ? (
        <EmptyState
          icon={<Wrench />}
          title={t.admin.upgrades.empty}
          description={t.admin.upgrades.emptyDescription}
        />
      ) : (
        <Card>
          <Table>
            <THead>
              <tr>
                <Th>{t.admin.upgrades.upgrade}</Th>
                <Th>{t.admin.game}</Th>
                <Th align="center">{t.admin.uses}</Th>
                <Th align="right">{t.admin.status}</Th>
              </tr>
            </THead>
            <TBody>
              {upgrades.map((upgrade) => (
                <Tr key={upgrade.id}>
                  <Td>
                    <Link href={`/admin/mejoras/${upgrade.id}`} className="font-semibold hover:text-primary hover:underline">
                      {upgrade.name}
                    </Link>
                  </Td>
                  <Td className="text-fg-muted">{upgrade.expansion ?? "—"}</Td>
                  <Td align="center">{upgrade._count.results}</Td>
                  <Td align="right">{upgrade.active ? <Badge tone="success">{t.admin.activeF}</Badge> : <Badge>{t.admin.inactiveF}</Badge>}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </Card>
      )}
    </Section>
  );
}

export default function AdminUpgradesPage() {
  return (
    <AdminSuspense>
      <AdminUpgradesPageContent />
    </AdminSuspense>
  );
}
