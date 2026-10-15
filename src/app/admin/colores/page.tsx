import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge, ButtonLink, Card, Section, Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { CarColorChip } from "@/components/domain/CarColorChip";
import { listCarColors } from "@/lib/data/catalog";
import { requireAdmin } from "@/lib/session";
import { AdminSuspense } from "@/components/admin/AdminSuspense";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.admin.pageTitle(t.admin.colors.title) };

async function AdminColorsPageContent() {
  await requireAdmin("/admin/colores");
  const colors = await listCarColors();

  return (
    <Section
      title={t.admin.colors.heading}
      actions={
        <ButtonLink href="/admin/colores/nuevo" size="sm">
          <Plus /> {t.admin.colors.new}
        </ButtonLink>
      }
    >
      <Card>
        <Table>
          <THead>
            <tr>
              <Th>{t.admin.colors.color}</Th>
              <Th align="center">{t.admin.colors.order}</Th>
              <Th align="center">{t.admin.uses}</Th>
              <Th align="right">{t.admin.status}</Th>
            </tr>
          </THead>
          <TBody>
            {colors.map((color) => (
              <Tr key={color.id}>
                <Td>
                  <Link href={`/admin/colores/${color.id}`} className="font-semibold hover:text-primary hover:underline">
                    <CarColorChip name={color.name} hex={color.hex} />
                  </Link>
                </Td>
                <Td align="center">{color.sortOrder}</Td>
                <Td align="center">{color._count.results}</Td>
                <Td align="right">{color.active ? <Badge tone="success">{t.admin.activeM}</Badge> : <Badge>{t.admin.inactiveM}</Badge>}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </Card>
    </Section>
  );
}

export default function AdminColorsPage() {
  return (
    <AdminSuspense>
      <AdminColorsPageContent />
    </AdminSuspense>
  );
}
