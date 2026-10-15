import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge, ButtonLink, Card, Section, Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { listTracks } from "@/lib/data/catalog";
import { requireAdmin } from "@/lib/session";
import { AdminSuspense } from "@/components/admin/AdminSuspense";
import { CountryFlag } from "@/components/domain/CountryFlag";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.admin.pageTitle(t.admin.tracks.title) };

async function AdminTracksPageContent() {
  await requireAdmin("/admin/circuitos");
  const tracks = await listTracks();

  return (
    <Section
      title={t.admin.tracks.title}
      actions={
        <ButtonLink href="/admin/circuitos/nuevo" size="sm">
          <Plus /> {t.admin.tracks.new}
        </ButtonLink>
      }
    >
      <Card>
        <Table>
          <THead>
            <tr>
              <Th>{t.admin.tracks.track}</Th>
              <Th>{t.admin.game}</Th>
              <Th align="center">{t.admin.tracks.laps}</Th>
              <Th align="center">{t.admin.races}</Th>
              <Th align="right">{t.admin.status}</Th>
            </tr>
          </THead>
          <TBody>
            {tracks.map((track) => (
              <Tr key={track.id}>
                <Td>
                  <span className="flex items-center gap-2.5">
                    {track.countryCode ? (
                      <CountryFlag code={track.countryCode} className="h-4 w-6 shrink-0 ring-1 ring-border" />
                    ) : (
                      <span title={t.admin.noCountry} className="h-4 w-6 shrink-0 border border-dashed border-border-strong" />
                    )}
                    <Link href={`/admin/circuitos/${track.id}`} className="font-semibold hover:text-primary hover:underline">
                      {track.name}
                    </Link>
                  </span>
                </Td>
                <Td className="text-fg-muted">{track.expansion ?? "—"}</Td>
                <Td align="center">{track.defaultLaps ?? <span className="text-fg-subtle">—</span>}</Td>
                <Td align="center">{track._count.races}</Td>
                <Td align="right">{track.active ? <Badge tone="success">{t.admin.activeM}</Badge> : <Badge>{t.admin.inactiveM}</Badge>}</Td>
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
