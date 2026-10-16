"use client";

import { useMemo } from "react";
import { Card, CardBody, CardHeader, CardTitle, Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { cornerStats } from "@/lib/race-log/corners";
import { cornerOf, type TrackGeometry, type TrackLayout } from "@/lib/race-log/layout";
import type { LoggedRound } from "@/lib/race-log/rounds";
import { TrackMap } from "./TrackMap";
import { t } from "@/i18n";

const STEPS = [1, 2, 3, 4];

/** Step 1–4 of the heat ramp relative to the busiest stretch; null for none. */
const stepFor = (passes: number, max: number) => (passes > 0 && max > 0 ? Math.ceil((4 * passes) / max) : null);

/** Track tinted by passes on each corner-to-corner stretch, with the numbers per corner. */
export function CornerHeatMap({ layout, geometry, rounds }: { layout: TrackLayout; geometry: TrackGeometry; rounds: LoggedRound[] }) {
  const stats = useMemo(() => cornerStats(layout, rounds), [layout, rounds]);
  const heat = useMemo(() => {
    const max = Math.max(...stats.map((s) => s.passes));
    const map = new Map<number, { fill: string; title: string }>();
    for (let space = 0; space < layout.spacesPerLap; space++) {
      const i = cornerOf(layout, space);
      const step = stepFor(stats[i].passes, max);
      if (step) map.set(space, { fill: `var(--heat-${step})`, title: t.raceLog.cornerTooltip(i + 1, stats[i].passes, stats[i].spins) });
    }
    return map;
  }, [layout, stats]);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{t.raceLog.cornersTitle}</CardTitle>
      </CardHeader>
      <div className="grid items-start lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div>
          <TrackMap layout={layout} geometry={geometry} cars={[]} heat={heat} />
          <CardBody className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 text-xs text-fg-muted">
            <span>{t.raceLog.fewerPasses}</span>
            <span aria-hidden className="flex gap-0.5">
              {STEPS.map((step) => (
                <span key={step} className="h-3 w-5" style={{ background: `var(--heat-${step})` }} />
              ))}
            </span>
            <span>{t.raceLog.morePasses}</span>
            <span className="basis-full">{t.raceLog.cornersHint}</span>
          </CardBody>
        </div>
        <Table>
          <THead>
            <tr>
              <Th />
              <Th align="right">{t.raceLog.passes}</Th>
              <Th align="right">{t.raceLog.spins}</Th>
              <Th align="right">{t.raceLog.slipstreams}</Th>
            </tr>
          </THead>
          <TBody>
            {stats.map((s, i) => (
              <Tr key={i}>
                <Td className="font-semibold whitespace-nowrap">{t.raceLog.corner(i + 1, layout.corners[i].limit)}</Td>
                <Td align="right">{s.passes}</Td>
                <Td align="right">{s.spins}</Td>
                <Td align="right">{s.slipstreams}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </div>
    </Card>
  );
}
