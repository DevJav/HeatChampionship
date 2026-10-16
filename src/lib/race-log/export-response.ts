import { getRaceLog } from "../data/race-logs";
import { getRace } from "../data/races";
import { raceTitle } from "../races";
import { absoluteUrl } from "../site-url";
import { logCsv, logExport } from "./log";
import { trackDrawing } from "./tracks";

/** Download of a published race's log, as the JSON document or the CSV table. */
export async function raceLogDownload(raceId: string, format: "json" | "csv") {
  const [race, saved] = await Promise.all([getRace(raceId), getRaceLog(raceId)]);
  const drawing = saved && trackDrawing(saved.log.track, saved.log.laps);
  if (!race || !saved || !drawing) return new Response("Not found", { status: 404 });

  const { log, names } = saved;
  const body =
    format === "csv"
      ? logCsv(drawing.layout, log, names)
      : JSON.stringify(
          logExport(drawing.layout, log, names, {
            title: raceTitle(race),
            date: race.scheduledAt.toISOString(),
            url: absoluteUrl(`/carreras/${race.id}`),
          }),
          null,
          2,
        );
  const filename = `heat-ronda-${race.round}-${race.track.slug}.${format}`;
  return new Response(body, {
    headers: {
      "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
