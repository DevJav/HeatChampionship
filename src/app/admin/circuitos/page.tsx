import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge, ButtonLink, Card, Section, Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { listTracks } from "@/lib/data/catalog";
import { requireAdmin } from "@/lib/session";
import { AdminSuspense } from "@/components/admin/AdminSuspense";

export const metadata: Metadata = { title: "Circuitos · Admin" };

async function AdminTracksPageContent() {
  await requireAdmin("/admin/circuitos");
  const tracks = await listTracks();

  return (
    <Section
      title="Circuitos"
      actions={
        <ButtonLink href="/admin/circuitos/nuevo" size="sm">
          <Plus /> Nuevo circuito
        </ButtonLink>
      }
    >
      <Card>
        <Table>
          <THead>
            <tr>
              <Th>Circuito</Th>
              <Th>Juego</Th>
              <Th align="center">Vueltas</Th>
              <Th align="center">Carreras</Th>
              <Th align="right">Estado</Th>
            </tr>
          </THead>
          <TBody>
            {tracks.map((track) => (
              <Tr key={track.id}>
                <Td>
                  <Link href={`/admin/circuitos/${track.id}`} className="font-semibold hover:text-primary hover:underline">
                    {track.name}
                  </Link>
                </Td>
                <Td className="text-fg-muted">{track.expansion ?? "—"}</Td>
                <Td align="center">{track.defaultLaps ?? <span className="text-fg-subtle">—</span>}</Td>
                <Td align="center">{track._count.races}</Td>
                <Td align="right">{track.active ? <Badge tone="success">Activo</Badge> : <Badge>Inactivo</Badge>}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </Card>
    </Section>
  );
}

export default function AdminTracksPage() {
  return (
    <AdminSuspense>
      <AdminTracksPageContent />
    </AdminSuspense>
  );
}
