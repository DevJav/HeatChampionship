"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  carPoint,
  dividerEnds,
  lapSpace,
  racingLineSide,
  spacePolygon,
  type Point,
  type TrackGeometry,
  type TrackLayout,
} from "@/lib/race-log/layout";
import { cn } from "@/lib/cn";
import { t } from "@/i18n";

export type MapCar = {
  id: string;
  color: string;
  /** One or two letters drawn on the car */
  label: string;
  /** Running position; fractional while animating */
  pos: number;
  spot: number;
};

type TrackMapProps = {
  layout: TrackLayout;
  geometry: TrackGeometry;
  cars: MapCar[];
  activeCarId?: string | null;
  /** Lap spaces to fit in view; the whole track when empty */
  focus?: number[];
  /** Lap spaces to tint as possible destinations */
  reachable?: Set<number>;
  /** Lap spaces that are full */
  blocked?: Set<number>;
  /** Fill and hover text per lap space, for heat maps */
  heat?: Map<number, { fill: string; title: string }>;
  /** Width / height of the frame; defaults to the track card's. Squarer frames zoom in further on phones. */
  aspect?: number;
  onSpaceTap?: (space: number) => void;
  className?: string;
};

const points = (ps: Point[]) => ps.map((p) => `${p.x},${p.y}`).join(" ");
const PAD = 40;
const CAR = { length: 15, width: 9 };

/** Animates the viewBox towards the target so zooming in and out isn't a jump. */
function useTweenedBox(target: [number, number, number, number]) {
  const [box, setBox] = useState(target);
  const current = useRef(target);
  const key = target.join(" ");

  useEffect(() => {
    const from = current.current;
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 350);
      const ease = 1 - (1 - t) ** 3;
      const next = from.map((v, i) => v + (target[i] - v) * ease) as typeof target;
      current.current = next;
      setBox(next);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return box;
}

/**
 * Vector drawing of a track from its traced geometry: asphalt, space
 * dividers, the racing-line edge, corners with their speed limits and the
 * start/finish line. Cars sit on their spot; spaces can be tapped.
 */
export function TrackMap({
  layout,
  geometry,
  cars,
  activeCarId,
  focus = [],
  reachable,
  blocked,
  heat,
  onSpaceTap,
  aspect: frameAspect,
  className,
}: TrackMapProps) {
  const { width, height, halfWidth } = geometry;
  const n = layout.spacesPerLap;
  const cornerAt = useMemo(() => new Map(layout.corners.map((c, i) => [c.before, i])), [layout]);

  const target = useMemo((): [number, number, number, number] => {
    const ps = focus.length
      ? focus.flatMap((s) => spacePolygon(geometry, lapSpace(layout, s)))
      : [
          { x: PAD, y: PAD },
          { x: width - PAD, y: height - PAD },
        ];
    let x0 = Math.min(...ps.map((p) => p.x)) - PAD;
    let y0 = Math.min(...ps.map((p) => p.y)) - PAD;
    let x1 = Math.max(...ps.map((p) => p.x)) + PAD;
    let y1 = Math.max(...ps.map((p) => p.y)) + PAD;
    // Fixed frame shape, so zooming never changes the map's height
    const aspect = frameAspect ?? width / height;
    if ((x1 - x0) / (y1 - y0) < aspect) {
      const grow = (y1 - y0) * aspect - (x1 - x0);
      x0 -= grow / 2;
      x1 += grow / 2;
    } else {
      const grow = (x1 - x0) / aspect - (y1 - y0);
      y0 -= grow / 2;
      y1 += grow / 2;
    }
    return [x0, y0, x1 - x0, y1 - y0];
  }, [focus, geometry, layout, width, height, frameAspect]);
  const box = useTweenedBox(target);

  // Racing-line edge: the side of each space where spot 0 sits
  const racingEdges = useMemo(
    () =>
      Array.from({ length: n }, (_, s) => {
        const side = racingLineSide(layout, s) === "right" ? 1 : 0;
        const a = dividerEnds(geometry, s)[side];
        const b = dividerEnds(geometry, (s + 1) % n)[side];
        return [a, b] as [Point, Point];
      }),
    [geometry, layout, n],
  );

  const finish = dividerEnds(geometry, 0);

  return (
    <svg
      viewBox={box.join(" ")}
      className={cn("block h-auto w-full touch-manipulation select-none", className)}
      role="img"
      aria-label={t.raceLog.map}
    >
      <rect x={-width} y={-height} width={width * 3} height={height * 3} fill="var(--track-ground)" />

      {/* Asphalt with a pale edge */}
      <path d={geometry.path} fill="none" stroke="var(--track-edge)" strokeWidth={halfWidth * 2 + 3} strokeLinejoin="round" />
      <path d={geometry.path} fill="none" stroke="var(--track-asphalt)" strokeWidth={halfWidth * 2 - 1} strokeLinejoin="round" />
      <path d={geometry.path} fill="none" stroke="var(--track-line)" strokeWidth={0.8} strokeDasharray="4 4" />

      {racingEdges.map(([a, b], s) => (
        <line key={s} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--track-edge)" strokeWidth={3} strokeLinecap="round" />
      ))}

      {/* Tap targets and highlights */}
      {geometry.dividers.map((_, s) => {
        const hot = heat?.get(s);
        const tint = blocked?.has(s)
          ? "var(--track-blocked)"
          : reachable?.has(s)
            ? "var(--track-highlight)"
            : (hot?.fill ?? "transparent");
        return (
          <polygon
            key={s}
            points={points(spacePolygon(geometry, s))}
            fill={tint}
            className={onSpaceTap ? "cursor-pointer" : undefined}
            onClick={onSpaceTap ? () => onSpaceTap(s) : undefined}
          >
            {hot && <title>{hot.title}</title>}
          </polygon>
        );
      })}

      {/* Dividers; corner lines thick */}
      {geometry.dividers.map((_, s) => {
        if (s === 0) return null;
        const [a, b] = dividerEnds(geometry, s);
        const corner = cornerAt.has(s);
        return (
          <line
            key={s}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={corner ? "var(--track-edge)" : "var(--track-line)"}
            strokeWidth={corner ? 3.5 : 1}
            pointerEvents="none"
          />
        );
      })}

      {/* Start/finish: chequered */}
      <line x1={finish[0].x} y1={finish[0].y} x2={finish[1].x} y2={finish[1].y} stroke="var(--bar-fg)" strokeWidth={6} pointerEvents="none" />
      <line
        x1={finish[0].x}
        y1={finish[0].y}
        x2={finish[1].x}
        y2={finish[1].y}
        stroke="var(--bar)"
        strokeWidth={6}
        strokeDasharray="3 3"
        pointerEvents="none"
      />

      {/* Speed limits */}
      {layout.corners.map((corner, i) => {
        const [x, y] = geometry.badges[i];
        return (
          <g key={i} pointerEvents="none">
            <circle cx={x} cy={y} r={15} fill="var(--surface)" stroke="var(--track-asphalt)" strokeWidth={2.5} />
            <text x={x} y={y} dy="0.35em" textAnchor="middle" className="fill-fg font-display text-[18px] font-bold">
              {corner.limit}
            </text>
          </g>
        );
      })}

      {/* Cars, back of the field first so the leader is drawn on top */}
      {[...cars]
        .sort((a, b) => a.pos - b.pos)
        .map((car) => {
          const p = carPoint(layout, geometry, car.pos, car.spot);
          const active = car.id === activeCarId;
          return (
            <g key={car.id} transform={`translate(${p.x} ${p.y}) rotate(${p.angle})`} pointerEvents="none">
              {active && <circle r={13} fill="none" stroke="var(--accent)" strokeWidth={2.5} className="animate-pulse" />}
              <rect
                x={-CAR.length / 2}
                y={-CAR.width / 2}
                width={CAR.length}
                height={CAR.width}
                rx={2.5}
                fill={car.color}
                stroke="var(--bar)"
                strokeWidth={1}
              />
              <text
                transform={`rotate(${-p.angle})`}
                dy="0.35em"
                textAnchor="middle"
                className="font-display text-[7px] font-bold"
                fill="var(--bar-fg)"
                stroke="var(--bar)"
                strokeWidth={1.6}
                paintOrder="stroke"
              >
                {car.label}
              </text>
            </g>
          );
        })}
    </svg>
  );
}
