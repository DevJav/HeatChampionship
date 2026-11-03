"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui";
import { trackDrawing } from "@/lib/race-log/tracks";
import { TrackMap } from "./TrackMap";
import { t } from "@/i18n";

/** The empty track as drawn in the recorder and the replay; nothing for tracks not traced yet. */
export function TrackPlan({ track }: { track: string }) {
  const drawing = trackDrawing(track);
  if (!drawing) return null;
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{t.raceLog.map}</CardTitle>
      </CardHeader>
      <TrackMap layout={drawing.layout} geometry={drawing.geometry} cars={[]} distances />
    </Card>
  );
}
