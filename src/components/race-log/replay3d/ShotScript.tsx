"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Bell, Clapperboard, Crown, Eye, Flag, Minus, Plus, Redo2, RotateCcw, RotateCw, Scissors, Trash2, Undo2 } from "lucide-react";
import { Button, Select } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  fitShots,
  lastLapAt,
  nearestCorner,
  readScript,
  REPLAY_RATE,
  REPLAY_RATES,
  REPLAY_VIEWS,
  replayWindow,
  SHOT_KINDS,
  type Replay,
  type ReplayView,
  type Shot,
  type ShotKind,
} from "./director";
import { indexAt, insertShot, moveCut, moveShot, patchShot, removeShot, resize, sourceLength, splitAt } from "./script-edit";
import { t } from "@/i18n";

/** Kinds that film one car you can pick; the others choose for themselves */
const WITH_SUBJECT: ShotKind[] = ["chase", "onboard", "heli", "trackside", "replay", "outro"];

/** Colour of each kind of shot on the timeline, and whether its label needs dark text */
const KIND_COLOR: Record<ShotKind, { bg: string; dark?: boolean }> = {
  grid: { bg: "#5b6170" },
  chase: { bg: "#2a78d6" },
  onboard: { bg: "#148f64" },
  heli: { bg: "#7c5cd6" },
  trackside: { bg: "#d9592a" },
  replay: { bg: "#f2a900", dark: true },
  finish: { bg: "#30343b" },
  outro: { bg: "#5b6170" },
  podium: { bg: "#d4a017", dark: true },
};

/** Lane heights in pixels */
const LANE = { ruler: 30, moments: 28, sources: 24, shots: 46 };
const HEADER_WIDTH = 84;
/** Edges and cuts snap to moments, other cuts and the playhead within this many pixels */
const SNAP_PX = 7;
const MAX_ZOOM = 24;
/** Arrow keys move the playhead this far (rounds); with Shift, ten times as far */
const NUDGE = 0.05;

// ---------- The script kept on this device ----------

const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

function readLocal(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, shots: Shot[] | null) {
  try {
    if (shots) localStorage.setItem(key, JSON.stringify(shots.map(({ start, kind, subject, cam, of, view, rate }) => ({ start, kind, subject, cam, of, view, rate }))));
    else localStorage.removeItem(key);
  } catch {}
  listeners.forEach((listener) => listener());
}

/**
 * The TV shots: the automatic plan, or the script edited on this device
 * (kept per race in the browser, so it survives reloads but stays here).
 */
export function useShotScript(replay: Replay, raceId: string) {
  const key = `heat:replay3d-script:${raceId}`;
  const saved = useSyncExternalStore(subscribe, () => readLocal(key), () => null);
  const edited = useMemo(() => {
    if (!saved) return null;
    try {
      return readScript(replay.stage, JSON.parse(saved), replay.start, replay.end);
    } catch {
      return null;
    }
  }, [saved, replay]);
  return {
    shots: edited ?? replay.shots,
    edited: edited !== null,
    save: (shots: Shot[]) => writeLocal(key, fitShots(replay.stage, shots, replay.start, replay.end)),
    reset: () => writeLocal(key, null),
  };
}

// ---------- Moments of the race ----------

type MomentKind = "spin" | "lead" | "pass" | "finish" | "lastLap";
type Moment = { t: number; kind: MomentKind; id: string | null; label: string; window: [number, number] | null };

/** What happens in the race, for the moments lane and for picking what a replay shows */
function raceMoments(replay: Replay): Moment[] {
  const { motion, names } = replay.stage;
  const m = t.raceLog.replay3d.script.moments;
  const name = (id: string) => names[id] ?? "?";
  const moments: Moment[] = [];
  for (const e of motion.events) {
    if (e.kind === "spin") moments.push({ t: e.t, kind: "spin", id: e.id, label: m.spin(name(e.id)), window: replayWindow(e) });
    if (e.kind === "pass")
      moments.push({ t: e.t, kind: e.lead ? "lead" : "pass", id: e.id, label: e.lead ? m.lead(name(e.id)) : m.pass(name(e.id), name(e.other)), window: replayWindow(e) });
    if (e.kind === "finish") moments.push({ t: e.t, kind: "finish", id: e.id, label: m.finish(e.position, name(e.id)), window: replayWindow(e) });
  }
  const lastLap = lastLapAt(replay.stage);
  if (lastLap !== null) moments.push({ t: lastLap, kind: "lastLap", id: null, label: m.lastLap, window: null });
  return moments.sort((a, b) => a.t - b.t);
}

const MOMENT_STYLE: Record<MomentKind, { icon: typeof Flag | null; className: string }> = {
  spin: { icon: RotateCw, className: "size-5 bg-[#e5484d] text-white" },
  lead: { icon: Crown, className: "size-5 bg-accent text-accent-fg" },
  finish: { icon: Flag, className: "size-5 bg-bar text-bar-fg" },
  lastLap: { icon: Bell, className: "size-5 bg-info text-white" },
  pass: { icon: null, className: "size-2 bg-fg-subtle" },
};

// ---------- The timeline ----------

type ShotScriptProps = {
  replay: Replay;
  shots: Shot[];
  edited: boolean;
  time: number;
  onSave: (shots: Shot[]) => void;
  onReset: () => void;
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
};

type Selection = { type: "shot"; index: number } | { type: "moment"; index: number } | null;
type Drag =
  | { type: "cut"; index: number }
  | { type: "move"; index: number; grab: number }
  | { type: "source"; index: number; grab: number }
  | { type: "scrub" };

/**
 * The broadcast script as a video-editing timeline: the moments of the race,
 * what each replay plays back, and the shots as blocks as long as they last.
 * Drag a cut to change where one shot hands over to the next, a shot to slide
 * it, a replay's source to pick what it shows; the inspector below changes
 * the selected shot.
 */
export function ShotScript({ replay, shots: saved, edited, time, onSave, onReset, onSeek, onTogglePlay }: ShotScriptProps) {
  const { stage } = replay;
  const s = t.raceLog.replay3d.script;
  const moments = useMemo(() => raceMoments(replay), [replay]);
  const cars = stage.motion.official.map((id) => ({ id, name: stage.names[id] ?? "?", color: stage.colors[id] }));

  const [draft, setDraft] = useState<Shot[] | null>(null);
  const shots = draft ?? saved;
  const [selected, setSelected] = useState<Selection>(null);
  const [zoom, setZoom] = useState(1);
  // Each step back or forward is a script, or null for the automatic one
  const [history, setHistory] = useState<{ undo: (Shot[] | null)[]; redo: (Shot[] | null)[] }>({ undo: [], redo: [] });
  const current = edited ? saved : null;

  // Width of the visible timeline, to fit the whole replay at zoom 1
  const scroller = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [viewWidth, setViewWidth] = useState(0);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setViewWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const duration = replay.end - replay.start;
  const px = (Math.max(200, viewWidth) / duration) * zoom;
  const x = (at: number) => (at - replay.start) * px;
  const clock = (at: number) => {
    const seconds = Math.max(0, Math.round((at - replay.start) * replay.secondsPerRound));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  };
  const seconds = (rounds: number) => (rounds * replay.secondsPerRound).toFixed(1);
  const clampTime = (at: number) => Math.min(replay.end, Math.max(replay.start, at));
  const replayNumber = (i: number) => shots.slice(0, i + 1).filter((shot) => shot.kind === "replay").length;

  // ----- Editing, with undo -----

  function commit(next: Shot[] | null, select?: Selection) {
    if (!next) return;
    setHistory(({ undo }) => ({ undo: [...undo, current], redo: [] }));
    onSave(next);
    if (select !== undefined) setSelected(select);
  }

  /** Undo (back) or redo (forward), keeping where we were to go the other way */
  function stepHistory(direction: "undo" | "redo") {
    const other = direction === "undo" ? "redo" : "undo";
    if (!history[direction].length) return;
    const previous = history[direction].at(-1)!;
    setHistory({ [direction]: history[direction].slice(0, -1), [other]: [...history[other], current] } as typeof history);
    if (previous) onSave(previous);
    else onReset();
    setSelected(null);
  }


  const selectedShot = selected?.type === "shot" ? shots[selected.index] : null;
  const selectedMoment = selected?.type === "moment" ? moments[selected.index] : null;
  const canSplit = splitAt(shots, time) !== null;

  function split() {
    const next = splitAt(saved, time);
    if (next) commit(next, { type: "shot", index: indexAt(next, time) });
  }

  function remove() {
    if (selected?.type !== "shot") return;
    commit(removeShot(saved, selected.index), null);
  }

  /** A replay of a moment, from `start`, as long as the moment takes in slow motion */
  function addReplay(moment: Moment | null, start: number) {
    const rate = REPLAY_RATE;
    const window = moment?.window ?? [Math.max(0, start - 1.4), start - 0.2];
    const subject = moment?.id ?? saved[indexAt(saved, start)].subject;
    const { shots: next, index } = insertShot(saved, { kind: "replay", subject, of: Math.max(0, window[0]), view: "front", rate }, start, (window[1] - window[0]) / rate);
    commit(next, { type: "shot", index });
    onSeek(next[index].start + 0.001);
  }

  /** The last big moment that's over by the playhead */
  function lastMomentBefore(at: number) {
    return moments.filter((m) => m.window && m.kind !== "pass" && m.window[1] <= at).at(-1) ?? null;
  }

  function change(index: number, patch: Partial<Shot>) {
    let next = patchShot(saved, index, patch);
    const shot = next[index];
    if (patch.kind === "trackside") next = patchShot(next, index, { cam: nearestCorner(stage, shot.subject, (shot.start + shot.end) / 2) });
    if (patch.kind === "replay" && shot.of === undefined) next = patchShot(next, index, { rate: REPLAY_RATE, of: Math.max(0, shot.start - (shot.end - shot.start) * REPLAY_RATE - 0.2) });
    commit(next);
  }

  /** Replay speed, keeping what it plays back: the shot gets longer or shorter */
  function changeRate(index: number, rate: number) {
    commit(resize(patchShot(saved, index, { rate }), index, sourceLength(saved[index]) / rate));
  }

  function replayMoment(index: number, moment: Moment) {
    const shot = saved[index];
    const [from, to] = moment.window!;
    const next = patchShot(saved, index, { of: Math.max(0, from), subject: moment.id ?? shot.subject });
    commit(resize(next, index, (to - from) / (shot.rate ?? REPLAY_RATE)));
  }

  // ----- Dragging -----

  const drag = useRef<Drag | null>(null);
  const timeAt = (clientX: number) => replay.start + (clientX - inner.current!.getBoundingClientRect().left) / px;

  /** A time pulled onto a nearby moment, cut or the playhead */
  function snap(at: number, ignoreCut?: number) {
    const targets = [time, ...moments.map((m) => m.t), ...saved.map((shot, i) => (i === ignoreCut ? NaN : shot.start))];
    let best = at;
    let bestDistance = SNAP_PX / px;
    for (const target of targets) {
      const distance = Math.abs(target - at);
      if (distance < bestDistance) [best, bestDistance] = [target, distance];
    }
    return best;
  }

  function startDrag(event: React.PointerEvent, what: Drag) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    scroller.current?.focus({ preventScroll: true });
    drag.current = what;
    const startX = event.clientX;
    let moved = false;
    let latest: Shot[] | null = null;

    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      if (Math.abs(e.clientX - startX) > 3) moved = true;
      if (!moved && d.type !== "scrub") return;
      const at = timeAt(e.clientX);
      if (d.type === "scrub") onSeek(clampTime(at));
      else if (d.type === "cut") latest = moveCut(saved, d.index, snap(at, d.index));
      else if (d.type === "move") latest = moveShot(saved, d.index, snap(at - d.grab));
      else latest = patchShot(saved, d.index, { of: Math.max(0, snap(at - d.grab)) });
      if (latest) setDraft(latest);
    };
    const onUp = (e: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const d = drag.current;
      drag.current = null;
      setDraft(null);
      if (!d) return;
      if (moved && latest) {
        commit(latest);
        return;
      }
      // A click: select what was clicked, and put the playhead there
      const at = clampTime(timeAt(e.clientX));
      if (d.type === "move" || d.type === "cut") {
        setSelected({ type: "shot", index: d.type === "cut" ? indexAt(saved, at) : d.index });
        onSeek(at);
      } else if (d.type === "source") {
        setSelected({ type: "shot", index: d.index });
        onSeek(at);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    if (what.type === "scrub") onSeek(clampTime(timeAt(event.clientX)));
  }

  // Keep the playhead in view while it plays, unless you're dragging something
  const playheadX = x(time);
  useEffect(() => {
    const el = scroller.current;
    if (!el || drag.current) return;
    if (playheadX < el.scrollLeft || playheadX > el.scrollLeft + el.clientWidth - 24) el.scrollLeft = playheadX - el.clientWidth / 3;
  }, [playheadX]);

  // Zoom around the playhead
  function zoomTo(next: number) {
    const el = scroller.current;
    const z = Math.min(MAX_ZOOM, Math.max(1, next));
    setZoom(z);
    if (el) requestAnimationFrame(() => (el.scrollLeft = x(time) * (z / zoom) - el.clientWidth / 2));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement) return;
    const mod = e.ctrlKey || e.metaKey;
    if (e.key === " ") onTogglePlay();
    else if (e.key === "ArrowLeft" || e.key === "ArrowRight") onSeek(clampTime(time + (e.key === "ArrowLeft" ? -1 : 1) * NUDGE * (e.shiftKey ? 10 : 1)));
    else if (mod && (e.key === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) stepHistory("redo");
    else if (mod && e.key.toLowerCase() === "z") stepHistory("undo");
    else if (!mod && e.key.toLowerCase() === "s") split();
    else if (e.key === "Delete" || e.key === "Backspace") remove();
    else return;
    e.preventDefault();
  }

  // Ruler: a label every so many seconds, so they don't crowd
  const tickSeconds = [1, 2, 5, 10, 15, 30, 60, 120].find((step) => (step / replay.secondsPerRound) * px >= 64) ?? 120;
  const ticks: number[] = [];
  for (let sec = 0; replay.start + sec / replay.secondsPerRound <= replay.end; sec += tickSeconds) ticks.push(replay.start + sec / replay.secondsPerRound);
  const rounds = Array.from({ length: stage.motion.lastRound + 1 }, (_, r) => r);
  const width = duration * px;

  const laneLabel = "flex items-center px-2 text-xs font-bold uppercase text-fg-muted";

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg">{s.title}</h2>
        <span className="text-xs text-fg-muted">{edited ? s.edited : s.automatic}</span>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <Button size="icon" variant="ghost" className="size-8" title={s.undo} aria-label={s.undo} disabled={!history.undo.length} onClick={() => stepHistory("undo")}>
            <Undo2 />
          </Button>
          <Button size="icon" variant="ghost" className="size-8" title={s.redo} aria-label={s.redo} disabled={!history.redo.length} onClick={() => stepHistory("redo")}>
            <Redo2 />
          </Button>
          <span className="mx-1 h-5 w-px bg-border" />
          <Button size="sm" variant="secondary" title={s.splitTitle} onClick={split} disabled={!canSplit}>
            <Scissors /> {s.split}
          </Button>
          <Button size="sm" variant="secondary" title={s.addReplayTitle} onClick={() => addReplay(lastMomentBefore(time), time)}>
            <Clapperboard /> {s.addReplay}
          </Button>
          <Button size="sm" variant="secondary" title={s.removeTitle} onClick={remove} disabled={!selectedShot || shots.length < 2}>
            <Trash2 /> {s.remove}
          </Button>
          <span className="mx-1 h-5 w-px bg-border" />
          <Button size="icon" variant="ghost" className="size-8" title={s.zoomOut} aria-label={s.zoomOut} disabled={zoom <= 1} onClick={() => zoomTo(zoom / 1.6)}>
            <Minus />
          </Button>
          <Button size="icon" variant="ghost" className="size-8" title={s.zoomIn} aria-label={s.zoomIn} disabled={zoom >= MAX_ZOOM} onClick={() => zoomTo(zoom * 1.6)}>
            <Plus />
          </Button>
          {edited && (
            <Button
              size="sm"
              variant="ghost"
              title={s.reset}
              onClick={() => {
                // Undoable like any other change
                setHistory(({ undo }) => ({ undo: [...undo, current], redo: [] }));
                setSelected(null);
                onReset();
              }}
            >
              <RotateCcw /> {s.reset}
            </Button>
          )}
        </div>
      </div>

      <div className="flex select-none overflow-hidden rounded-control border border-border bg-surface-2">
        {/* Lane names */}
        <div className="flex shrink-0 flex-col border-r border-border bg-surface" style={{ width: HEADER_WIDTH }}>
          <div style={{ height: LANE.ruler }} className="border-b border-border" />
          <div style={{ height: LANE.moments }} className={laneLabel}>
            {s.lanes.moments}
          </div>
          <div style={{ height: LANE.sources }} className={laneLabel}>
            {s.lanes.sources}
          </div>
          <div style={{ height: LANE.shots }} className={laneLabel}>
            {s.lanes.shots}
          </div>
        </div>

        <div
          ref={scroller}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onWheel={(e) => {
            if (!e.ctrlKey && !e.metaKey) return;
            e.preventDefault();
            zoomTo(zoom * (e.deltaY < 0 ? 1.25 : 0.8));
          }}
          className="relative min-w-0 grow overflow-x-auto overflow-y-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60"
          aria-label={s.title}
        >
          <div ref={inner} className="relative" style={{ width, height: LANE.ruler + LANE.moments + LANE.sources + LANE.shots }}>
            {/* Ruler: video time above, rounds of the race below; press and drag to scrub */}
            <div className="absolute inset-x-0 top-0 cursor-col-resize border-b border-border bg-surface" style={{ height: LANE.ruler }} onPointerDown={(e) => startDrag(e, { type: "scrub" })}>
              {ticks.map((at) => (
                <span key={at} className="absolute top-0 h-2.5 border-l border-fg-subtle pl-1 text-[10px] leading-3 tabular-nums text-fg-muted" style={{ left: x(at) }}>
                  {clock(at)}
                </span>
              ))}
              {rounds.map((r) => (
                <span key={r} className="absolute bottom-0 h-2 border-l border-border-strong" style={{ left: x(r) }}>
                  {px >= 26 && r > 0 && <span className="absolute bottom-0 left-0.5 text-[9px] leading-none text-fg-subtle">R{r}</span>}
                </span>
              ))}
            </div>

            {/* Moments of the race */}
            <div className="absolute inset-x-0" style={{ top: LANE.ruler, height: LANE.moments }}>
              {moments.map((moment, i) => {
                const style = MOMENT_STYLE[moment.kind];
                const Icon = style.icon;
                const active = selected?.type === "moment" && selected.index === i;
                return (
                  <button
                    key={i}
                    type="button"
                    title={`${clock(moment.t)} · ${moment.label}`}
                    aria-label={moment.label}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      setSelected({ type: "moment", index: i });
                      onSeek(moment.t);
                    }}
                    className={cn(
                      "absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-sm",
                      style.className,
                      active && "ring-2 ring-primary ring-offset-1",
                      moment.kind === "pass" ? "z-0" : "z-10",
                    )}
                    style={{ left: x(moment.t) }}
                  >
                    {Icon && <Icon className="size-3" strokeWidth={2.5} />}
                  </button>
                );
              })}
            </div>

            {/* What each replay plays back */}
            <div className="absolute inset-x-0" style={{ top: LANE.ruler + LANE.moments, height: LANE.sources }}>
              {shots.map((shot, i) => {
                if (shot.kind !== "replay" || shot.of === undefined) return null;
                const active = selected?.type === "shot" && selected.index === i;
                return (
                  <div
                    key={i}
                    title={`${s.replayNumber(replayNumber(i))} · ${s.source(clock(shot.of), clock(shot.of + sourceLength(shot)))}`}
                    onPointerDown={(e) => startDrag(e, { type: "source", index: i, grab: timeAt(e.clientX) - shot.of! })}
                    className={cn(
                      "absolute top-1 bottom-1 flex cursor-grab items-center overflow-hidden rounded-sm border border-[#b37d00] px-1 text-[10px] font-bold text-[#3d2a00] active:cursor-grabbing",
                      active ? "bg-[#f2a900]" : "bg-[#f2a900]/40",
                    )}
                    style={{ left: x(shot.of), width: Math.max(4, sourceLength(shot) * px) }}
                  >
                    R{replayNumber(i)}
                  </div>
                );
              })}
            </div>

            {/* The shots, back to back */}
            <div className="absolute inset-x-0" style={{ top: LANE.ruler + LANE.moments + LANE.sources, height: LANE.shots }}>
              {shots.map((shot, i) => {
                const color = KIND_COLOR[shot.kind];
                const active = selected?.type === "shot" && selected.index === i;
                const car = WITH_SUBJECT.includes(shot.kind) ? cars.find((c) => c.id === shot.subject) : null;
                const label = shot.kind === "replay" ? `R${replayNumber(i)}` : s.kinds[shot.kind];
                return (
                  <div
                    key={i}
                    title={`${s.shotTitle(i + 1, s.kinds[shot.kind])}${car ? ` · ${car.name}` : ""} · ${s.range(clock(shot.start), clock(shot.end), seconds(shot.end - shot.start))}`}
                    onPointerDown={(e) => startDrag(e, { type: "move", index: i, grab: timeAt(e.clientX) - shot.start })}
                    className={cn(
                      "absolute top-1 bottom-1 flex flex-col justify-center overflow-hidden rounded-sm border-l-4 px-1.5 text-xs leading-tight",
                      i > 0 && i < shots.length - 1 ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                      color.dark ? "text-[#1d1500]" : "text-white",
                      active && "z-10 outline-2 outline-offset-1 outline-primary",
                    )}
                    style={{ left: x(shot.start) + 1, width: Math.max(2, (shot.end - shot.start) * px - 2), background: color.bg, borderLeftColor: car?.color ?? "transparent" }}
                  >
                    <span className="truncate font-bold">{label}</span>
                    {car && <span className="truncate opacity-90">{car.name}</span>}
                  </div>
                );
              })}
              {/* Cuts between shots: drag to move */}
              {shots.slice(1).map((shot, k) => (
                <div
                  key={k}
                  onPointerDown={(e) => startDrag(e, { type: "cut", index: k + 1 })}
                  className="group absolute top-0 bottom-0 z-20 flex w-3 -translate-x-1/2 cursor-ew-resize justify-center"
                  style={{ left: x(shot.start) }}
                >
                  <span className="h-full w-0.5 bg-white/0 group-hover:bg-white group-active:bg-white" />
                </div>
              ))}
            </div>

            {/* Playhead */}
            <div className="pointer-events-none absolute top-0 bottom-0 z-30 w-0.5 -translate-x-1/2 bg-primary" style={{ left: playheadX }}>
              <span className="absolute -top-px left-1/2 size-0 -translate-x-1/2 border-x-[6px] border-t-[8px] border-x-transparent border-t-primary" />
            </div>
          </div>
        </div>
      </div>

      {/* Inspector */}
      <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-control border border-border bg-surface px-3 py-2">
        {selectedShot && selected?.type === "shot" ? (
          <ShotInspector
            index={selected.index}
            shot={selectedShot}
            number={replayNumber(selected.index)}
            cars={cars}
            corners={stage.layout.corners}
            moments={moments}
            time={time}
            clock={clock}
            seconds={seconds}
            onChange={(patch) => change(selected.index, patch)}
            onRate={(rate) => changeRate(selected.index, rate)}
            onMoment={(moment) => replayMoment(selected.index, moment)}
            onSeek={onSeek}
          />
        ) : selectedMoment ? (
          <>
            <span className="text-sm font-bold">{selectedMoment.label}</span>
            <span className="text-sm tabular-nums text-fg-muted">
              {clock(selectedMoment.t)} · {t.raceLog.round(Math.ceil(selectedMoment.t))}
            </span>
            <div className="ml-auto flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => onSeek(Math.max(replay.start, (selectedMoment.window?.[0] ?? selectedMoment.t) - 0.1))}>
                <Eye /> {s.goTo}
              </Button>
              {selectedMoment.window && (
                <Button size="sm" variant="secondary" onClick={() => addReplay(selectedMoment, Math.max(time, selectedMoment.window![1] + 0.3))}>
                  <Clapperboard /> {s.replayThis}
                </Button>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-fg-muted">{s.nothingSelected}</p>
        )}
      </div>
      <p className="text-xs text-fg-muted">
        {s.description} {s.shortcuts}
      </p>
    </div>
  );
}

type InspectorProps = {
  index: number;
  shot: Shot;
  /** Its number among the replays, for a replay */
  number: number;
  cars: { id: string; name: string }[];
  corners: { limit: number }[];
  moments: Moment[];
  time: number;
  clock: (at: number) => string;
  seconds: (rounds: number) => string;
  onChange: (patch: Partial<Shot>) => void;
  onRate: (rate: number) => void;
  onMoment: (moment: Moment) => void;
  onSeek: (at: number) => void;
};

/** Everything about the selected shot: what it films, and for a replay what it plays back and how */
function ShotInspector({ index, shot, number, cars, corners, moments, time, clock, seconds, onChange, onRate, onMoment, onSeek }: InspectorProps) {
  const s = t.raceLog.replay3d.script;
  const select = "h-8 w-auto text-sm";
  const replayable = moments.filter((m) => m.window);
  return (
    <>
      <div className="flex flex-col">
        <span className="text-sm font-bold">{shot.kind === "replay" ? s.replayNumber(number) : s.shotTitle(index + 1, s.kinds[shot.kind])}</span>
        <span className="text-xs tabular-nums text-fg-muted">{s.range(clock(shot.start), clock(shot.end), seconds(shot.end - shot.start))}</span>
      </div>
      <Select value={shot.kind} onChange={(e) => onChange({ kind: e.target.value as ShotKind })} aria-label={s.kind} className={select}>
        {SHOT_KINDS.map((kind) => (
          <option key={kind} value={kind}>
            {s.kinds[kind]}
          </option>
        ))}
      </Select>
      {WITH_SUBJECT.includes(shot.kind) ? (
        <Select value={shot.subject} onChange={(e) => onChange({ subject: e.target.value })} aria-label={s.car} className={select}>
          {cars.map((car) => (
            <option key={car.id} value={car.id}>
              {car.name}
            </option>
          ))}
        </Select>
      ) : (
        <span className="text-sm text-fg-muted">{shot.kind === "finish" ? s.nextToCross : s.chooses}</span>
      )}
      {shot.kind === "trackside" && (
        <Select value={shot.cam} onChange={(e) => onChange({ cam: Number(e.target.value) })} aria-label={s.corner} className={select}>
          {corners.map((corner, c) => (
            <option key={c} value={c}>
              {t.raceLog.replay3d.corner(c + 1, corner.limit)}
            </option>
          ))}
        </Select>
      )}
      {shot.kind === "replay" && (
        <>
          <Select value={shot.view} onChange={(e) => onChange({ view: e.target.value as ReplayView })} aria-label={s.view} title={s.view} className={select}>
            {REPLAY_VIEWS.map((view) => (
              <option key={view} value={view}>
                {s.views[view]}
              </option>
            ))}
          </Select>
          <Select value={shot.rate ?? REPLAY_RATE} onChange={(e) => onRate(Number(e.target.value))} aria-label={s.speed} title={s.speed} className={select}>
            {REPLAY_RATES.map((rate) => (
              <option key={rate} value={rate}>
                {s.speedValue(rate)}
              </option>
            ))}
          </Select>
          <div className="flex basis-full flex-wrap items-center gap-2 border-t border-border pt-2">
            {shot.of !== undefined && <span className="text-sm tabular-nums">{s.source(clock(shot.of), clock(shot.of + sourceLength(shot)))}</span>}
            <Button size="sm" variant="ghost" onClick={() => onSeek(Math.max(0, (shot.of ?? 0) - 0.05))}>
              <Eye /> {s.watchSource}
            </Button>
            <Button size="sm" variant="ghost" title={s.sourceHereTitle} onClick={() => onChange({ of: Math.max(0, time) })}>
              <RotateCw /> {s.sourceHere}
            </Button>
            <Select
              value=""
              onChange={(e) => {
                const moment = replayable[Number(e.target.value)];
                if (moment) onMoment(moment);
              }}
              aria-label={s.replayMoment}
              className={cn(select, "max-w-72")}
            >
              <option value="">{s.replayMoment}…</option>
              {replayable.map((moment, i) => (
                <option key={i} value={i}>
                  {clock(moment.t)} · {moment.label}
                </option>
              ))}
            </Select>
          </div>
        </>
      )}
    </>
  );
}
