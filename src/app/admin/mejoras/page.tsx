import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Wrench } from "lucide-react";
import { Badge, ButtonLink, Card, EmptyState, Section, Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { listUpgrades } from "@/lib/data/catalog";
import { requireAdmin } from "@/lib/session";
import { AdminSuspense } from "@/components/admin/AdminSuspense";

export const metadata: Metadata = { title: "Mejoras · Admin" };

async function AdminUpgradesPageContent() {
  await requireAdmin("/admin/mejoras");
  const upgrades = await listUpgrades();

  return (
    <Section
      title="Mejoras"
      actions={
        <ButtonLink href="/admin/mejoras/nueva" size="sm">
          <Plus /> Nueva mejora
        </ButtonLink>
      }
    >
      {upgrades.length === 0 ? (
        <EmptyState
          icon={<Wrench />}
          title="Sin mejoras"
          description="Añade las cartas de mejora de tu edición para registrar cuáles usa cada piloto."
        />
      ) : (
        <Card>
          <Table>
            <THead>
              <tr>
                <Th>Mejora</Th>
                <Th>Juego</Th>
                <Th align="center">Usos</Th>
                <Th align="right">Estado</Th>
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
                  <Td align="right">{upgrade.active ? <Badge tone="success">Activa</Badge> : <Badge>Inactiva</Badge>}</Td>
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
