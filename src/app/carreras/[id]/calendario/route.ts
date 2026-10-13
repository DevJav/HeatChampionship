import { icsCalendar } from "@/lib/calendar";
import { getRace } from "@/lib/data/races";
import { raceCalendarEvent } from "@/lib/race-share";
import { absoluteUrl } from "@/lib/site-url";

/** The race as a calendar invite (.ics): opens "Add to calendar" on phones and desktop apps. */
export async function GET(_request: Request, { params }: RouteContext<"/carreras/[id]/calendario">) {
  const { id } = await params;
  const race = await getRace(id);
  if (!race) return new Response("Not found", { status: 404 });

  const ics = icsCalendar(raceCalendarEvent(race, absoluteUrl(`/carreras/${race.id}`)));
  const filename = `heat-ronda-${race.round}-${race.track.slug}.ics`;
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
