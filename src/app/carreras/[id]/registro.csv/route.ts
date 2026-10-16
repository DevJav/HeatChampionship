import { raceLogDownload } from "@/lib/race-log/export-response";

/** The race's round-by-round log as a CSV table, one row per driver and round. */
export async function GET(_request: Request, { params }: RouteContext<"/carreras/[id]/registro.csv">) {
  const { id } = await params;
  return raceLogDownload(id, "csv");
}
