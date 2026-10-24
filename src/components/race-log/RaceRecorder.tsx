"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, Undo2, Wind, Zap } from "lucide-react";
import { Badge, Button, Card, CardBody, CardHeader, CardTitle } from "@/components/ui";
import { tabItemClass, tabListClass } from "@/components/ui/tabStyles";
import { cn } from "@/lib/cn";
import { lapSpace, type TrackGeometry, type TrackLayout } from "@/lib/race-log/layout";
import { isRaceOver, type Draft } from "@/lib/race-log/log";
import {
  carsAt,
  placeCar,
  resolveTap,
  swapSpots,
  turnOrder,
  type CarFlags,
  type LoggedRound,
} from "@/lib/race-log/rounds";
import { RaceReplay, type LogCarView } from "./RaceReplay";
import { TrackMap } from "./TrackMap";
import { useCarAnimation } from "./useCarAnimation";
import { useBoxAspect, useCompact, usePhoneMapAspect } from "./viewport";
import { t } from "@/i18n";

/** The log being recorded, plus the undo history of the round in progress (not saved). */
export type RecorderLog = { rounds: LoggedRound[]; draft: Draft; history: Draft[] };

type SetLog = React.Dispatch<React.SetStateAction<RecorderLog>>;

export type RaceRecorderProps = {
  layout: TrackLayout;
  geometry: TrackGeometry;
  /** In grid order */
  cars: LogCarView[];
  log: RecorderLog;
  setLog: SetLog;
  /** Extra controls at the right of the tab bar (save status, restart…) */
  toolbar?: React.ReactNode;
  /** Shown in place of "Close round" once every car has finished */
  finishAction?: React.ReactNode;
};

/** How far ahead a car can plausibly get in one round */
const REACH = 22;
/** Spaces ahead shown when zoomed in on the car to place; fewer on phones for bigger tap targets */
const ZOOM_AHEAD = 16;
const COMPACT_ZOOM_AHEAD = 12;

function range(from: number, to: number) {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

const formatMove = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

/**
 * Round-by-round race entry: at the end of each round, tap where every car
 * finished in turn order. On phones it fits one screen; on desktop the turn
 * order sits beside the map. A second tab replays what has been logged.
 */
export function RaceRecorder({ layout, geometry, cars, log, setLog, toolbar, finishAction }: RaceRecorderProps) {
  const [mode, setMode] = useState<"record" | "replay">("record");
  const compact = useCompact();
  const raceOver = isRaceOver(layout, log);
  const panel = { layout, geometry, cars, log, setLog, raceOver, finishAction };

  return (
    <div
      className={cn(
        "flex flex-col",
        // One screen on phones: below the sticky site header, minus the page's top padding
        compact && mode === "record" ? "h-[calc(100dvh-var(--header-height)-2.5rem)] min-h-[34rem] gap-2" : "gap-4",
      )}
    >
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <div role="tablist" className={cn(tabListClass, "min-w-0 grow")}>
          {(
            [
              ["record", t.raceLog.record],
              ["replay", t.raceLog.replay],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              onClick={() => setMode(id)}
              className={cn(tabItemClass(mode === id), "max-sm:px-3")}
            >
              {label}
            </button>
          ))}
        </div>
        {toolbar && <div className="flex shrink-0 items-center gap-1 sm:gap-2">{toolbar}</div>}
      </div>

      {mode === "replay" ? (
        <RaceReplay layout={layout} geometry={geometry} cars={cars} rounds={log.rounds} />
      ) : compact ? (
        <CompactRecordPanel {...panel} />
      ) : (
        <RecordPanel {...panel} />
      )}
    </div>
  );
}

type PanelProps = {
  layout: TrackLayout;
  geometry: TrackGeometry;
  cars: LogCarView[];
  log: RecorderLog;
  setLog: SetLog;
  raceOver: boolean;
  finishAction?: React.ReactNode;
};

/** State and actions of the round being entered, shared by the desktop and phone layouts. */
function useRoundEntry({ layout, geometry, log, setLog, cars }: PanelProps, zoomAhead: number) {
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [zoomedOut, setZoomedOut] = useState(false);
  const byId = useMemo(() => new Map(cars.map((c) => [c.id, c])), [cars]);

  const { draft } = log;
  const start = log.rounds[log.rounds.length - 1].positions;
  const order = turnOrder(layout, start);
  const active = selected ?? order.find((id) => !draft.placed.includes(id)) ?? null;
  const roundNumber = log.rounds.length;
  const leaderLap = Math.min(layout.laps, Math.floor(Math.max(0, ...Object.values(draft.positions).map((c) => c.pos)) / layout.spacesPerLap) + 1);

  const shown = useCarAnimation(draft.positions, order);

  const from = active ? start[active].pos : 0;
  const reach = active ? range(from - 2, from + REACH) : [];
  const ahead = reach.filter((p) => p > from);
  const full = (p: number) => carsAt(draft.positions, p, active ?? undefined).length >= 2;
  const reachable = new Set(ahead.filter((p) => !full(p)).map((p) => lapSpace(layout, p)));
  const blocked = new Set(ahead.filter(full).map((p) => lapSpace(layout, p)));
  const focus = zoomedOut ? [] : active ? range(from - 1, from + zoomAhead) : Object.values(draft.positions).map((c) => c.pos);

  function update(next: Draft) {
    setLog((l) => ({ ...l, draft: next, history: [...l.history, l.draft] }));
  }

  function tap(space: number) {
    if (!active) return;
    const pos = resolveTap(layout, from, space);
    const positions = placeCar(draft.positions, active, pos);
    if (!positions) {
      setNotice(t.raceLog.spaceFull);
      return;
    }
    setNotice(null);
    setSelected(null);
    update({ ...draft, positions, placed: [...draft.placed.filter((id) => id !== active), active] });
  }

  function toggle(id: string, flag: keyof CarFlags) {
    const current = draft.flags[id] ?? {};
    update({ ...draft, flags: { ...draft.flags, [id]: { ...current, [flag]: !current[flag] } } });
  }

  function swap(id: string) {
    update({ ...draft, positions: swapSpots(draft.positions, draft.positions[id].pos) });
  }

  function undo() {
    setLog((l) => ({ ...l, draft: l.history[l.history.length - 1], history: l.history.slice(0, -1) }));
  }

  function closeRound() {
    setLog((l) => ({
      ...l,
      rounds: [...l.rounds, { positions: l.draft.positions, flags: l.draft.flags }],
      draft: { positions: l.draft.positions, placed: [], flags: {} },
      history: [],
    }));
  }

  function reopenRound() {
    setLog((l) => {
      if (l.rounds.length < 2) return l;
      const last = l.rounds[l.rounds.length - 1];
      const before = l.rounds[l.rounds.length - 2].positions;
      return {
        ...l,
        rounds: l.rounds.slice(0, -1),
        draft: { positions: last.positions, placed: turnOrder(layout, before), flags: last.flags },
        history: [],
      };
    });
  }

  return {
    byId,
    draft,
    order,
    active,
    selected,
    setSelected,
    notice,
    zoomedOut,
    setZoomedOut,
    roundNumber,
    leaderLap,
    laps: layout.laps,
    mapProps: {
      layout,
      geometry,
      cars: cars.map((c) => ({ ...c, ...(shown[c.id] ?? draft.positions[c.id]) })),
      activeCarId: active,
      focus,
      reachable,
      blocked,
      distances: true,
      onSpaceTap: active ? tap : undefined,
    },
    moved: (id: string) => draft.positions[id].pos - start[id].pos,
    sharing: (id: string) => carsAt(draft.positions, draft.positions[id].pos).length === 2,
    toggle,
    swap,
    undo,
    canUndo: log.history.length > 0,
    closeRound,
    reopenRound,
    canReopen: draft.placed.length === 0 && log.rounds.length > 1,
    allPlaced: order.every((id) => draft.placed.includes(id)),
  };
}

type RoundEntry = ReturnType<typeof useRoundEntry>;

function RoundActions({
  entry,
  raceOver,
  finishAction,
  compact,
}: {
  entry: RoundEntry;
  raceOver: boolean;
  finishAction?: React.ReactNode;
  compact?: boolean;
}) {
  const size = compact ? "md" : "sm";
  return (
    <>
      {/* Icon only on phones so "Close round" always fits */}
      <Button
        size={compact ? "icon" : size}
        variant="secondary"
        disabled={!entry.canUndo}
        onClick={entry.undo}
        title={t.raceLog.undo}
        aria-label={compact ? t.raceLog.undo : undefined}
      >
        <Undo2 /> {!compact && t.raceLog.undo}
      </Button>
      {entry.canReopen && (
        <Button size={size} variant="secondary" onClick={entry.reopenRound}>
          {compact ? t.raceLog.reopen : t.raceLog.reopenRound(entry.roundNumber - 1)}
        </Button>
      )}
      {raceOver && finishAction ? (
        <div className="ml-auto">{finishAction}</div>
      ) : (
        <Button size={size} className="ml-auto" disabled={!entry.allPlaced || raceOver} onClick={entry.closeRound}>
          {t.raceLog.closeRound}
        </Button>
      )}
    </>
  );
}

function Prompt({ entry, raceOver }: { entry: RoundEntry; raceOver: boolean }) {
  const { active, byId } = entry;
  if (raceOver) return <span className="font-semibold">{t.raceLog.raceOver}</span>;
  if (!active) return <span>{t.raceLog.allPlaced}</span>;
  const car = byId.get(active)!;
  return (
    <>
      <span className="size-4 shrink-0 rounded-sm ring-1 ring-fg/40" style={{ background: car.color }} />
      <span>
        <strong>{car.name}</strong>: {t.raceLog.tapSpace}
      </span>
    </>
  );
}

function RecordPanel(props: PanelProps) {
  const { raceOver, finishAction } = props;
  const aspect = usePhoneMapAspect();
  const entry = useRoundEntry(props, ZOOM_AHEAD);
  const { byId, draft, order, active } = entry;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>{t.raceLog.round(entry.roundNumber)}</CardTitle>
          <span className="font-display text-sm font-bold uppercase italic">{t.raceLog.lap(entry.leaderLap, entry.laps)}</span>
          <button
            type="button"
            onClick={() => entry.setZoomedOut((z) => !z)}
            className="ml-auto font-display text-sm font-bold uppercase italic opacity-80 hover:opacity-100"
          >
            {entry.zoomedOut ? t.raceLog.zoomIn : t.raceLog.seeAll}
          </button>
        </CardHeader>
        <TrackMap {...entry.mapProps} aspect={aspect} />
        <CardBody className="flex min-h-14 items-center gap-3 py-3 text-sm">
          <Prompt entry={entry} raceOver={raceOver} />
          {entry.notice && <span className="ml-auto text-danger">{entry.notice}</span>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.raceLog.turnOrder}</CardTitle>
          <Badge tone="accent">
            {draft.placed.filter((id) => order.includes(id)).length}/{order.length}
          </Badge>
        </CardHeader>
        <ol className="flex flex-col divide-y divide-border">
          {order.map((id, i) => {
            const car = byId.get(id)!;
            const placed = draft.placed.includes(id);
            const flags = draft.flags[id] ?? {};
            return (
              <li key={id} className={cn("flex items-center gap-2 px-3 py-2", id === active && "bg-accent/15")}>
                <span className="w-4 text-right text-xs tabular-nums text-fg-subtle">{i + 1}</span>
                <button type="button" onClick={() => entry.setSelected(id)} className="flex min-w-0 grow items-center gap-2 text-left">
                  <span className="size-3.5 shrink-0 rounded-sm ring-1 ring-fg/40" style={{ background: car.color }} />
                  <span className="truncate font-semibold">{car.name}</span>
                  <span className="ml-auto text-sm tabular-nums text-fg-muted">{placed ? formatMove(entry.moved(id)) : "…"}</span>
                </button>
                <FlagButton on={!!flags.slipstream} label={t.raceLog.slipstream} onClick={() => entry.toggle(id, "slipstream")}>
                  <Wind />
                </FlagButton>
                <FlagButton on={!!flags.spun} label={t.raceLog.spun} onClick={() => entry.toggle(id, "spun")}>
                  <Zap />
                </FlagButton>
                <button
                  type="button"
                  title={t.raceLog.swapTitle}
                  aria-label={t.raceLog.swap}
                  disabled={!entry.sharing(id)}
                  onClick={() => entry.swap(id)}
                  className="grid size-8 place-items-center text-fg-muted hover:text-fg disabled:invisible [&_svg]:size-4"
                >
                  <ArrowLeftRight />
                </button>
              </li>
            );
          })}
        </ol>
        <div className="flex flex-wrap gap-2 border-t border-border p-3">
          <RoundActions entry={entry} raceOver={raceOver} finishAction={finishAction} />
        </div>
      </Card>
    </div>
  );
}

/**
 * Phone and tablet layout: everything on one screen, no scrolling. The map
 * takes the space left over, the turn order is a grid of chips under it, and
 * the flags apply to the car just placed (or the one picked), so a slipstream
 * is one tap right after placing the car.
 */
function CompactRecordPanel(props: PanelProps) {
  const { raceOver, cars, finishAction } = props;
  const [frameRef, aspect] = useBoxAspect();
  const entry = useRoundEntry(props, COMPACT_ZOOM_AHEAD);
  const { byId, draft, order, active, selected } = entry;

  const flagCarId = selected ?? draft.placed[draft.placed.length - 1] ?? null;
  const flagCar = flagCarId ? byId.get(flagCarId)! : null;
  const flags = flagCarId ? (draft.flags[flagCarId] ?? {}) : {};
  const columns = cars.length === 5 || cars.length === 6 ? "grid-cols-3" : "grid-cols-4";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <Card className="relative min-h-0 flex-1 overflow-hidden">
        <div ref={frameRef} className="relative min-h-0 flex-1">
          {aspect && <TrackMap {...entry.mapProps} aspect={aspect} className="absolute inset-0 h-full" />}
        </div>

        {/* Overlays on the map */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2">
          <span className="surface-bar px-2.5 py-1 font-display text-sm font-bold uppercase italic">
            {t.raceLog.roundAndLap(entry.roundNumber, entry.leaderLap, entry.laps)}
          </span>
          <button
            type="button"
            onClick={() => entry.setZoomedOut((z) => !z)}
            className="pointer-events-auto surface-bar px-3 py-1.5 font-display text-sm font-bold uppercase italic"
          >
            {entry.zoomedOut ? t.raceLog.zoomIn : t.raceLog.seeAll}
          </button>
        </div>
        {/* The highlighted chip already says whose turn it is; only errors and the end of the race show here */}
        {(entry.notice || raceOver) && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-2">
            <div className="flex items-center gap-2 bg-surface/90 px-2.5 py-1.5 text-sm shadow-sm">
              {entry.notice ? <span className="text-danger">{entry.notice}</span> : <Prompt entry={entry} raceOver={raceOver} />}
            </div>
          </div>
        )}
      </Card>

      <ol className={cn("grid gap-1", columns)} aria-label={t.raceLog.turnOrder}>
        {order.map((id, i) => {
          const car = byId.get(id)!;
          const placed = draft.placed.includes(id);
          const carFlags = draft.flags[id] ?? {};
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => entry.setSelected(id)}
                aria-current={id === active ? "step" : undefined}
                className={cn(
                  "flex h-10 w-full items-center gap-1.5 surface-panel px-1.5 text-left text-sm",
                  id === active ? "ring-2 ring-accent ring-inset" : !placed && "opacity-60",
                )}
              >
                <span className="sr-only">{i + 1}</span>
                <span className="size-3 shrink-0 rounded-sm ring-1 ring-fg/40" style={{ background: car.color }} />
                <span className="min-w-0 truncate font-semibold">{car.name}</span>
                {/* Chips run in turn order, so the number is left out to give the name room */}
                {placed && (
                  <span className="ml-auto flex shrink-0 items-center gap-0.5 text-xs tabular-nums text-fg-muted">
                    {carFlags.slipstream && <Wind className="size-3 text-info" aria-label={t.raceLog.slipstream} />}
                    {carFlags.spun && <Zap className="size-3 text-danger" aria-label={t.raceLog.spun} />}
                    {formatMove(entry.moved(id))}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="flex h-11 items-center gap-1 surface-panel pl-3">
        {flagCar && flagCarId ? (
          <>
            <span className="size-3.5 shrink-0 rounded-sm ring-1 ring-fg/40" style={{ background: flagCar.color }} />
            <span className="min-w-0 truncate text-sm font-semibold">{flagCar.name}</span>
            <div className="ml-auto flex h-full">
              <BigFlagButton on={!!flags.slipstream} label={t.raceLog.slipstream} onClick={() => entry.toggle(flagCarId, "slipstream")}>
                <Wind />
              </BigFlagButton>
              <BigFlagButton on={!!flags.spun} label={t.raceLog.spun} onClick={() => entry.toggle(flagCarId, "spun")}>
                <Zap />
              </BigFlagButton>
              <BigFlagButton on={false} label={t.raceLog.swap} disabled={!entry.sharing(flagCarId)} onClick={() => entry.swap(flagCarId)}>
                <ArrowLeftRight />
              </BigFlagButton>
            </div>
          </>
        ) : (
          <span className="text-sm text-fg-muted">{t.raceLog.flagsHint}</span>
        )}
      </div>

      <div className="flex gap-2">
        <RoundActions entry={entry} raceOver={raceOver} finishAction={finishAction} compact />
      </div>
    </div>
  );
}

function FlagButton({ on, label, onClick, children }: { on: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "grid size-8 place-items-center transition-colors [&_svg]:size-4",
        on ? "bg-primary text-primary-fg" : "text-fg-subtle hover:bg-surface-2 hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

function BigFlagButton({
  on,
  label,
  disabled,
  onClick,
  children,
}: {
  on: boolean;
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-full items-center gap-1.5 px-3 font-display text-xs font-bold uppercase italic transition-colors disabled:opacity-30 [&_svg]:size-4",
        on ? "bg-primary text-primary-fg" : "text-fg-muted active:bg-surface-2",
      )}
    >
      {children}
      {label}
    </button>
  );
}
