import { getDossierInput } from "@/lib/data/dossier";
import { raceDossier } from "@/lib/dossier";
import { getCurrentUser, isAdmin } from "@/lib/session";
import { slugify } from "@/lib/slug";

/** The race dossier (Markdown) for writing its report or preview. Organisers only: it includes the organiser's notes. */
export async function GET(_request: Request, { params }: RouteContext<"/carreras/[id]/cronica.md">) {
  const { id } = await params;
  if (!isAdmin(await getCurrentUser())) return new Response("Not found", { status: 404 });
  const input = await getDossierInput(id);
  if (!input) return new Response("Not found", { status: 404 });

  const filename = `cronica-ronda-${input.race.round}-${slugify(input.race.track)}.md`;
  return new Response(raceDossier(input), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
