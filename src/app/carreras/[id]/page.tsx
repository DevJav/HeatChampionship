import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Pencil } from "lucide-react";
import {
  Alert,
  Badge,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ChequeredStrip,
  Container,
  Skeleton,
  SpeedStripes,
} from "@/components/ui";
import { RaceStatusBadge } from "@/components/domain/RaceStatusBadge";
import { EntryList } from "@/components/races/EntryList";
import { RaceMeta } from "@/components/races/RaceMeta";
import { RaceSignupPanel } from "@/components/races/RaceSignupPanel";
import { getRace } from "@/lib/data/races";
import { getCurrentUser, isAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Carrera" };

async function RaceView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = isAdmin(await getCurrentUser());
  const race = await getRace(id, { includeDraft: admin });
  if (!race) notFound();

  return (
    <div className="flex flex-col gap-8">
      {race.status === "DRAFT" && (
        <Alert tone="warning">Borrador: solo lo ven los administradores.</Alert>
      )}

      <section className="relative overflow-hidden border-l-4 border-primary surface-bar clip-chamfer">
        <SpeedStripes className="absolute inset-y-0 right-0 w-1/2 opacity-80" />
        <div className="relative flex flex-col items-start gap-3 px-6 py-8 sm:px-10">
          <div className="flex flex-wrap gap-2">
            <Badge tone="primary">Ronda {race.round}</Badge>
            <Badge tone="bar">{race.season.name}</Badge>
            <RaceStatusBadge race={race} />
          </div>
          <h1 className="text-5xl sm:text-7xl">{race.track.name}</h1>
          <RaceMeta race={race} className="text-bar-fg/80" />
          {admin && (
            <ButtonLink href={`/admin/carreras/${race.id}`} variant="inverse" size="sm">
              <Pencil /> Editar
            </ButtonLink>
          )}
        </div>
        <ChequeredStrip className="relative text-bar-fg/80" />
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Parrilla</CardTitle>
          </CardHeader>
          <CardBody>
            <EntryList entrants={race.registrations} maxPlayers={race.maxPlayers} />
          </CardBody>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Inscripción</CardTitle>
            </CardHeader>
            <CardBody>
              <RaceSignupPanel race={race} />
            </CardBody>
          </Card>
          {race.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notas</CardTitle>
              </CardHeader>
              <CardBody className="whitespace-pre-line text-sm text-fg-muted">{race.notes}</CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RacePage({ params }: PageProps<"/carreras/[id]">) {
  return (
    <Container>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <RaceView params={params} />
      </Suspense>
    </Container>
  );
}
