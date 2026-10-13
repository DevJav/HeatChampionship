import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, RotateCcw, Users } from "lucide-react";
import { clearResults } from "@/actions/results";
import { Alert, ButtonLink, Card, CardBody, CardDescription, CardHeader, CardTitle, ConfirmButton, EmptyState } from "@/components/ui";
import { AdminSuspense } from "@/components/admin/AdminSuspense";
import { ResultsEditor, type ResultsEditorProps } from "@/components/admin/ResultsEditor";
import { getResultsEditorData } from "@/lib/data/results";
import { raceTitle } from "@/lib/races";
import { parsePointsTable } from "@/lib/scoring";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Resultados · Admin" };

async function ResultsPageContent({ params }: PageProps<"/admin/carreras/[id]/resultados">) {
  const { id } = await params;
  await requireAdmin(`/admin/carreras/${id}/resultados`);
  const data = await getResultsEditorData(id);
  if (!data) notFound();
  const { race, players, carColors, upgrades } = data;
  const finished = race.status === "FINISHED";
  const pointsTable = parsePointsTable(race.season.pointsTable);

  const initial: ResultsEditorProps["initial"] = Object.fromEntries(
    race.results.map((result) => [
      result.userId,
      {
        position: result.position == null ? "RET" : String(result.position),
        startPosition: result.startPosition == null ? "" : String(result.startPosition),
        carColorId: result.carColorId ?? "",
        upgradeIds: result.upgrades.map((u) => u.upgradeId),
        notes: result.notes ?? "",
      },
    ]),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-3xl">Resultados · {raceTitle(race)}</h2>
        <ButtonLink href={`/admin/carreras/${race.id}`} variant="ghost" size="sm">
          <ArrowLeft /> Volver a la carrera
        </ButtonLink>
      </div>

      {finished && (
        <Alert tone="info">
          Esta carrera ya tiene resultados. Al guardar se sustituyen y se recalculan los puntos.
        </Alert>
      )}

      {players.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="No hay pilotos con plaza"
          description="Inscribe a los pilotos que corrieron desde la página de la carrera."
          action={<ButtonLink href={`/admin/carreras/${race.id}`}>Ir a inscritos</ButtonLink>}
        />
      ) : (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Hoja de resultados</CardTitle>
              <CardDescription>
                Puntos de la temporada: {pointsTable.join(" · ")}. ¿Falta alguien? Inscríbelo en la carrera.
              </CardDescription>
            </div>
          </CardHeader>
          <CardBody>
            <ResultsEditor
              raceId={race.id}
              players={players}
              carColors={carColors}
              upgrades={upgrades}
              pointsTable={pointsTable}
              initial={initial}
            />
          </CardBody>
        </Card>
      )}

      {finished && (
        <Card>
          <CardHeader>
            <CardTitle>Anular resultados</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-fg-muted">
              Borra los resultados y los puntos. La carrera vuelve a «Inscripción cerrada».
            </p>
            <form action={clearResults.bind(null, race.id)}>
              <ConfirmButton
                title="¿Anular los resultados?"
                description="Se borrarán las posiciones y puntos de esta carrera. Las fotos se conservan."
                confirmLabel="Anular"
                size="sm"
              >
                <RotateCcw /> Anular resultados
              </ConfirmButton>
            </form>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

export default function ResultsPage(props: PageProps<"/admin/carreras/[id]/resultados">) {
  return (
    <AdminSuspense>
      <ResultsPageContent {...props} />
    </AdminSuspense>
  );
}
