import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge, ButtonLink, Card, Section, Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { CarColorChip } from "@/components/domain/CarColorChip";
import { listCarColors } from "@/lib/data/catalog";
import { requireAdmin } from "@/lib/session";
import { AdminSuspense } from "@/components/admin/AdminSuspense";

export const metadata: Metadata = { title: "Colores · Admin" };

async function AdminColorsPageContent() {
  await requireAdmin("/admin/colores");
  const colors = await listCarColors();

  return (
    <Section
      title="Colores de coche"
      actions={
        <ButtonLink href="/admin/colores/nuevo" size="sm">
          <Plus /> Nuevo color
        </ButtonLink>
      }
    >
      <Card>
        <Table>
          <THead>
            <tr>
              <Th>Color</Th>
              <Th align="center">Orden</Th>
              <Th align="center">Usos</Th>
              <Th align="right">Estado</Th>
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
                <Td align="right">{color.active ? <Badge tone="success">Activo</Badge> : <Badge>Inactivo</Badge>}</Td>
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
