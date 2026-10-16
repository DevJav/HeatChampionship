import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, RotateCcw, Users } from "lucide-react";
import { clearResults } from "@/actions/results";
import { Alert, ButtonLink, Card, CardBody, CardDescription, CardHeader, CardTitle, ConfirmButton, EmptyState } from "@/components/ui";
import { AdminSuspense } from "@/components/admin/AdminSuspense";
import { ResultsEditor, type ResultsEditorProps } from "@/components/admin/ResultsEditor";
import { getRaceLog } from "@/lib/data/race-logs";
import { getResultsEditorData } from "@/lib/data/results";
import { resultsFromLog } from "@/lib/race-log/log";
import { trackDrawing } from "@/lib/race-log/tracks";
import { raceTitle } from "@/lib/races";
import { parsePointsTable } from "@/lib/scoring";
import { requireAdmin } from "@/lib/session";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.admin.pageTitle(t.admin.results.title) };

async function ResultsPageContent({ params }: PageProps<"/admin/carreras/[id]/resultados">) {
  const { id } = await params;
  await requireAdmin(`/admin/carreras/${id}/resultados`);
  const data = await getResultsEditorData(id);
  if (!data) notFound();
  const { race, players, carColors, upgrades } = data;
  const finished = race.status === "FINISHED";
  const pointsTable = parsePointsTable(race.season.pointsTable);

  // A race without results yet starts from its round-by-round log, if it has one
  const saved = race.results.length === 0 ? await getRaceLog(race.id) : null;
  const drawing = saved && trackDrawing(saved.log.track, saved.log.laps);
  const fromLog = saved && drawing ? resultsFromLog(drawing.layout, saved.log) : null;

  const initial: ResultsEditorProps["initial"] = fromLog
    ? Object.fromEntries(
        fromLog.map((row) => [
          row.userId,
          {
            position: String(row.position),
            spins: row.spins,
            startPosition: String(row.startPosition),
            carColorId: row.carColorId ?? "",
          },
        ]),
      )
    : Object.fromEntries(
        race.results.map((result) => [
          result.userId,
          {
            position: String(result.position),
            spins: result.spins,
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
        <h2 className="text-3xl">{t.admin.results.heading(raceTitle(race))}</h2>
        <ButtonLink href={`/admin/carreras/${race.id}`} variant="ghost" size="sm">
          <ArrowLeft /> {t.admin.results.backToRace}
        </ButtonLink>
      </div>

      {fromLog && <Alert tone="info">{t.raceLog.resultsPrefilled}</Alert>}

      {finished && (
        <Alert tone="info">
          {t.admin.results.alreadyFinished}
        </Alert>
      )}

      {players.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title={t.admin.results.noDrivers}
          description={t.admin.results.noDriversDescription}
          action={<ButtonLink href={`/admin/carreras/${race.id}`}>{t.admin.results.goToEntrants}</ButtonLink>}
        />
      ) : (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{t.admin.results.sheet}</CardTitle>
              <CardDescription>
                {t.admin.results.sheetDescription(pointsTable.join(" · "))}
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
            <CardTitle>{t.admin.results.clear}</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-fg-muted">
              {t.admin.results.clearDescription}
            </p>
            <form action={clearResults.bind(null, race.id)}>
              <ConfirmButton
                title={t.admin.results.clearTitle}
                description={t.admin.results.clearConfirmDescription}
                confirmLabel={t.admin.results.clearConfirm}
                size="sm"
              >
                <RotateCcw /> {t.admin.results.clear}
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
