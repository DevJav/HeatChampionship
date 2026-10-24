"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { RotateCcw, Scissors, Trash2 } from "lucide-react";
import { Button, Select } from "@/components/ui";
import { cn } from "@/lib/cn";
import { fitShots, nearestCorner, readScript, REPLAY_VIEWS, shotAt, SHOT_KINDS, type Replay, type ReplayView, type Shot, type ShotKind } from "./director";
import { t } from "@/i18n";

/** Kinds that film one car you can pick; the others choose for themselves */
const WITH_SUBJECT: ShotKind[] = ["chase", "onboard", "heli", "trackside", "replay", "outro"];

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
    if (shots) localStorage.setItem(key, JSON.stringify(shots.map(({ start, kind, subject, cam, of, view }) => ({ start, kind, subject, cam, of, view }))));
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

type ShotScriptProps = {
  replay: Replay;
  shots: Shot[];
  edited: boolean;
  time: number;
  onSave: (shots: Shot[]) => void;
  onReset: () => void;
  onSeek: (time: number) => void;
};

/** The broadcast script: every TV shot in order, to watch, change, cut or remove. */
export function ShotScript({ replay, shots, edited, time, onSave, onReset, onSeek }: ShotScriptProps) {
  const { stage } = replay;
  const s = t.raceLog.replay3d.script;
  const current = shots.indexOf(shotAt(shots, time));
  const clock = (at: number) => {
    const seconds = Math.max(0, Math.round((at - replay.start) * replay.secondsPerRound));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  };
  const cars = stage.motion.official.map((id) => ({ id, name: stage.names[id] ?? "?" }));

  // Keep the shot on air in sight inside the list, without scrolling the page
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const box = list.current;
    const row = box?.children[current] as HTMLElement | undefined;
    if (!box || !row) return;
    if (row.offsetTop < box.scrollTop || row.offsetTop + row.offsetHeight > box.scrollTop + box.clientHeight) {
      box.scrollTop = row.offsetTop - box.clientHeight / 3;
    }
  }, [current]);

  function change(index: number, patch: Partial<Shot>) {
    const next = shots.map((shot, i) => (i === index ? { ...shot, ...patch } : shot));
    if (patch.kind === "trackside") {
      const shot = next[index];
      next[index] = { ...shot, cam: nearestCorner(stage, shot.subject, (shot.start + shot.end) / 2) };
    }
    onSave(next);
  }

  // A new shot from the moment on screen, like the one it splits until changed
  const canCut = time > shots[current].start + 0.05 && time < shots[current].end - 0.05;
  function cut() {
    onSave([...shots.slice(0, current + 1), { ...shots[current], start: time }, ...shots.slice(current + 1)]);
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg">{s.title}</h2>
        <span className="text-xs text-fg-muted">{edited ? s.edited : s.automatic}</span>
        <div className="ml-auto flex gap-1">
          <Button size="sm" variant="secondary" title={s.cutTitle} onClick={cut} disabled={!canCut}>
            <Scissors /> {s.cut} <span className="tabular-nums text-fg-muted">{clock(time)}</span>
          </Button>
          {edited && (
            <Button size="sm" variant="ghost" onClick={onReset}>
              <RotateCcw /> {s.reset}
            </Button>
          )}
        </div>
      </div>
      <p className="text-sm text-fg-muted">{s.description}</p>
      <ol ref={list} className="relative flex max-h-80 flex-col overflow-y-auto">
        {shots.map((shot, i) => {
          const between = i > 0 && Math.abs(time - shot.start) > 0.05 && time > shots[i - 1].start + 0.05 && time < (shots[i + 1]?.start ?? replay.end) - 0.05;
          return (
            <li
              key={`${i}-${shot.start}`}
              className={cn("flex flex-wrap items-center gap-2 border-l-4 border-transparent px-2 py-1.5", i === current && "border-primary bg-surface-2")}
            >
              <button
                type="button"
                className="w-12 text-left text-sm tabular-nums text-fg-muted hover:text-fg"
                title={s.watch}
                onClick={() => onSeek(shot.start + 0.001)}
              >
                {clock(shot.start)}
              </button>
              <Select
                value={shot.kind}
                onChange={(e) => change(i, { kind: e.target.value as ShotKind })}
                aria-label={s.kind}
                className="h-8 w-auto text-sm"
              >
                {SHOT_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {s.kinds[kind]}
                  </option>
                ))}
              </Select>
              {WITH_SUBJECT.includes(shot.kind) ? (
                <Select value={shot.subject} onChange={(e) => change(i, { subject: e.target.value })} aria-label={s.car} className="h-8 w-auto text-sm">
                  {cars.map((car) => (
                    <option key={car.id} value={car.id}>
                      {car.name}
                    </option>
                  ))}
                </Select>
              ) : (
                <span className="text-sm text-fg-muted">{shot.kind === "finish" ? s.nextToCross : ""}</span>
              )}
              {shot.kind === "replay" && (
                <Select value={shot.view} onChange={(e) => change(i, { view: e.target.value as ReplayView })} aria-label={s.view} className="h-8 w-auto text-sm">
                  {REPLAY_VIEWS.map((view) => (
                    <option key={view} value={view}>
                      {s.views[view]}
                    </option>
                  ))}
                </Select>
              )}
              {shot.kind === "trackside" && (
                <Select value={shot.cam} onChange={(e) => change(i, { cam: Number(e.target.value) })} aria-label={s.corner} className="h-8 w-auto text-sm">
                  {stage.layout.corners.map((corner, c) => (
                    <option key={c} value={c}>
                      {t.raceLog.corner(c + 1, corner.limit)}
                    </option>
                  ))}
                </Select>
              )}
              <div className="ml-auto flex gap-1">
                {between && (
                  <Button size="sm" variant="ghost" title={s.startHereTitle} onClick={() => change(i, { start: time })}>
                    {s.startHere}
                  </Button>
                )}
                {shots.length > 1 && (
                  <Button size="icon" variant="ghost" className="size-8" aria-label={s.remove} title={s.remove} onClick={() => onSave(shots.filter((_, j) => j !== i))}>
                    <Trash2 />
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
