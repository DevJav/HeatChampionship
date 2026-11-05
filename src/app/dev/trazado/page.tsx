import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container, PageHeader } from "@/components/ui";
import { tracedTracks } from "@/lib/race-log/tracks";
import { TrackEditor } from "./TrackEditor";

export const metadata: Metadata = { title: "Editor de trazados" };

/**
 * Hand-edit a traced track (see .claude/skills/trace-track): drag the centre
 * line, the dividers and the badges over a photo of the board, check the
 * result on the real map and save it back to src/lib/race-log. Development
 * only, because saving rewrites source files.
 */
export default function TrackEditorPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const tracks = tracedTracks().map(({ layout, geometry }) => ({ layout, geometry }));
  return (
    <Container className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Desarrollo"
        title="Editor de trazados"
        description="Corrige a mano un circuito trazado: arrastra los puntos de la línea central, las divisiones y las curvas sobre la foto del tablero, y guarda en su archivo."
      />
      <TrackEditor tracks={tracks} />
    </Container>
  );
}
