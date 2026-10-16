import { raceLogDownload } from "@/lib/race-log/export-response";

/** The race's round-by-round log as a JSON document (track, drivers, every round, stats). */
export async function GET(_request: Request, { params }: RouteContext<"/carreras/[id]/registro.json">) {
  const { id } = await params;
  return raceLogDownload(id, "json");
}
