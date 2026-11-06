import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container, PageHeader } from "@/components/ui";
import { tracedTracks } from "@/lib/race-log/tracks";
import { ReplayReview } from "./ReplayReview";

export const metadata: Metadata = { title: "Revisar repetición 3D" };

/**
 * The 3D replay on made-up races, to review it on every track without a race
 * in the database. Development only, like the track editor.
 */
export default function ReplayReviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <Container className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Desarrollo"
        title="Revisar repetición 3D"
        description="Carreras simuladas en cada circuito. La misma semilla da siempre la misma carrera, así que puedes volver a cualquier cosa que quieras comentar."
      />
      <ReplayReview tracks={tracedTracks().map(({ layout }) => ({ slug: layout.slug, spaces: layout.spacesPerLap, corners: layout.corners.length, laps: layout.laps }))} />
    </Container>
  );
}
