"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Play, Wind, Zap } from "lucide-react";
import { Button, Card, CardBody, CardHeader, CardTitle, Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { formatDecimal } from "@/lib/format";
import { driverInsights, rankHistory } from "@/lib/race-log/insights";
import { finishLine, type TrackGeometry, type TrackLayout } from "@/lib/race-log/layout";
import { classification, isFinished, turnOrder, type LoggedRound } from "@/lib/race-log/rounds";
import { CornerHeatMap } from "./CornerHeatMap";
import { LapChart } from "./LapChart";
import { TrackMap } from "./TrackMap";
import { useCarAnimation } from "./useCarAnimation";
import { usePhoneMapAspect } from "./viewport";
import { t } from "@/i18n";

export type LogCarView = { id: string; name: string; label: string; color: string };

export type RaceReplayProps = {
  layout: TrackLayout;
  geometry: TrackGeometry;
  cars: LogCarView[];
  rounds: LoggedRound[];
};

function range(from: number, to: number) {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

/** Animated replay of a logged race, with the lap chart and per-driver stats. */
export function RaceReplay({ layout, geometry, cars, rounds }: RaceReplayProps) {
  const last = rounds.length - 1;
  const [round, setRound] = useState(last);
  const [playing, setPlaying] = useState(false);
  const [follow, setFollow] = useState(false);
  const aspect = usePhoneMapAspect();
  const byId = useMemo(() => new Map(cars.map((c) => [c.id, c])), [cars]);

  const current = rounds[Math.min(round, last)];
  const before = rounds[Math.max(0, round - 1)].positions;
  const order = turnOrder(layout, before);
  const shown = useCarAnimation(current.positions, order);
  const ranks = useMemo(() => rankHistory(layout, rounds), [layout, rounds]);
  const insights = useMemo(() => driverInsights(layout, rounds), [layout, rounds]);
  const standings = classification(layout, rounds.slice(0, round + 1));

  // Playback stops by itself on the last round
  const isPlaying = playing && round < last;
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setTimeout(() => setRound((r) => r + 1), order.length * 160 + 1000);
    return () => clearTimeout(timer);
  }, [isPlaying, round, order.length]);

  const leader = current.positions[standings[0]];
  const leaderPos = leader ? Math.min(leader.pos, finishLine(layout)) : 0;
  const focus = follow && leader ? range(leaderPos - 14, leaderPos + 4) : [];

  if (last === 0) {
    return (
      <Card>
        <CardBody>{t.raceLog.noRounds}</CardBody>
      </Card>
    );
  }

  const formatMove = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>{round === 0 ? t.raceLog.grid : t.raceLog.round(round)}</CardTitle>
            <button
              type="button"
              onClick={() => setFollow((f) => !f)}
              className="font-display text-sm font-bold uppercase italic opacity-80 hover:opacity-100"
            >
              {follow ? t.raceLog.seeAll : t.raceLog.followLeader}
            </button>
          </CardHeader>
          <TrackMap
            layout={layout}
            geometry={geometry}
            cars={cars.map((c) => ({ ...c, ...(shown[c.id] ?? current.positions[c.id]) }))}
            focus={focus}
            aspect={aspect}
          />
          <CardBody className="flex items-center gap-3 py-3">
            <Button
              size="icon"
              variant="primary"
              aria-label={isPlaying ? t.raceLog.pause : t.raceLog.play}
              onClick={() => {
                if (!isPlaying && round >= last) setRound(0);
                setPlaying(!isPlaying);
              }}
            >
              {isPlaying ? <Pause /> : <Play />}
            </Button>
            <input
              type="range"
              min={0}
              max={last}
              value={round}
              onChange={(e) => {
                setPlaying(false);
                setRound(Number(e.target.value));
              }}
              className="grow accent-primary"
              aria-label={t.raceLog.roundSlider}
            />
            <span className="w-14 text-right text-sm tabular-nums text-fg-muted">
              {round}/{last}
            </span>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{round === last ? t.raceLog.standings : t.raceLog.positions}</CardTitle>
          </CardHeader>
          <ol className="flex flex-col divide-y divide-border">
            {standings.map((id, i) => {
              const car = byId.get(id)!;
              const moved = current.positions[id].pos - before[id].pos;
              const flags = current.flags[id] ?? {};
              const done = isFinished(layout, current.positions[id]);
              return (
                <li key={id} className="flex items-center gap-2 px-3 py-2">
                  <span className="w-4 text-right text-xs tabular-nums text-fg-subtle">{i + 1}</span>
                  <span className="size-3.5 shrink-0 rounded-sm ring-1 ring-fg/40" style={{ background: car.color }} />
                  <span className="font-semibold">{car.name}</span>
                  {flags.slipstream && <Wind className="size-4 text-info" aria-label={t.raceLog.slipstream} />}
                  {flags.spun && <Zap className="size-4 text-danger" aria-label={t.raceLog.spun} />}
                  <span className="ml-auto text-sm tabular-nums text-fg-muted">
                    {done ? t.raceLog.finish : round > 0 ? formatMove(moved) : ""}
                  </span>
                </li>
              );
            })}
          </ol>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.raceLog.positionsByRound}</CardTitle>
        </CardHeader>
        <CardBody>
          <LapChart
            cars={cars}
            ranks={ranks}
            current={round}
            onPick={(r) => {
              setPlaying(false);
              setRound(r);
            }}
          />
        </CardBody>
      </Card>

      <CornerHeatMap layout={layout} geometry={geometry} rounds={rounds} />

      <Card>
        <CardHeader>
          <CardTitle>{t.raceLog.raceData}</CardTitle>
        </CardHeader>
        <Table>
          <THead>
            <tr>
              <Th>{t.raceLog.driver}</Th>
              <Th align="right" title={t.raceLog.overtakesTitle}>
                {t.raceLog.overtakes}
              </Th>
              <Th align="right">{t.raceLog.slipstreams}</Th>
              <Th align="right">{t.raceLog.spins}</Th>
              <Th align="right" title={t.raceLog.averageTitle}>
                {t.raceLog.average}
              </Th>
              <Th align="right" title={t.raceLog.bestTitle}>
                {t.raceLog.best}
              </Th>
              <Th align="right" title={t.raceLog.ledTitle}>
                {t.raceLog.led}
              </Th>
            </tr>
          </THead>
          <TBody>
            {classification(layout, rounds).map((id) => {
              const s = insights.find((x) => x.id === id)!;
              return (
                <Tr key={id}>
                  <Td className="font-semibold">{byId.get(id)!.name}</Td>
                  <Td align="right">{s.overtakes}</Td>
                  <Td align="right">{s.slipstreams}</Td>
                  <Td align="right">{s.spins}</Td>
                  <Td align="right">{formatDecimal(s.averageMove)}</Td>
                  <Td align="right">{s.bestMove}</Td>
                  <Td align="right">{s.roundsLed}</Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
