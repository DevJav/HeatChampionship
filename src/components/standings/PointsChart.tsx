"use client";

import { useState } from "react";
import { niceTicks } from "@/lib/chart-scale";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { useElementWidth } from "@/components/charts/useElementWidth";

export type ChartRound = { label: string; title: string };

export type ChartSeries = {
  id: string;
  name: string;
  /** Running points total after each round */
  values: number[];
  /** 1–3 for the highlighted leaders, null for the rest (gray) */
  slot: 1 | 2 | 3 | null;
};

const HEIGHT = 280;
const PAD = { top: 16, right: 96, bottom: 30, left: 36 };
const LABEL_MIN_GAP = 14;

const strokeFor = (slot: ChartSeries["slot"]) => (slot ? `var(--series-${slot})` : "var(--series-muted)");

/**
 * Points progression: the top three in color, everyone else in gray.
 * Hover or arrow keys move a crosshair; the readout lists every driver.
 */
export function PointsChart({ rounds, series }: { rounds: ChartRound[]; series: ChartSeries[] }) {
  const [wrapper, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const plotWidth = Math.max(width - PAD.left - PAD.right, 50);
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const ticks = niceTicks(Math.max(0, ...series.flatMap((s) => s.values)));
  const max = ticks[ticks.length - 1];
  const x = (i: number) => PAD.left + (rounds.length === 1 ? plotWidth / 2 : (i / (rounds.length - 1)) * plotWidth);
  const y = (v: number) => PAD.top + plotHeight - (v / max) * plotHeight;
  const last = rounds.length - 1;

  // Draw gray lines first so the leaders sit on top
  const drawOrder = [...series].sort((a, b) => (a.slot ? 1 : 0) - (b.slot ? 1 : 0));
  const leaders = series.filter((s) => s.slot);

  // End labels only when they don't collide; otherwise the legend carries identity
  const endYs = leaders.map((s) => y(s.values[last])).sort((a, b) => a - b);
  const showEndLabels = endYs.every((v, i) => i === 0 || v - endYs[i - 1] >= LABEL_MIN_GAP);

  function pick(clientX: number) {
    const box = wrapper.current?.getBoundingClientRect();
    if (!box) return;
    const relative = (clientX - box.left - PAD.left) / plotWidth;
    setActive(Math.min(last, Math.max(0, Math.round(relative * last))));
  }

  const readout =
    active == null
      ? []
      : [...series].sort((a, b) => b.values[active] - a.values[active]).map((s) => ({ ...s, value: s.values[active] }));

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-fg-muted" aria-label="Leyenda">
        {leaders.map((s) => (
          <li key={s.id} className="flex items-center gap-2">
            <span aria-hidden className="h-0.5 w-4" style={{ background: strokeFor(s.slot) }} />
            <span className="font-semibold text-fg">{s.name}</span>
          </li>
        ))}
        {series.length > leaders.length && (
          <li className="flex items-center gap-2">
            <span aria-hidden className="h-0.5 w-4" style={{ background: strokeFor(null) }} />
            Resto de pilotos
          </li>
        )}
      </ul>

      <div ref={wrapper} className="relative">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label="Evolución de puntos por ronda. Usa las flechas para recorrer las rondas."
          tabIndex={0}
          className="block touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onPointerMove={(e) => pick(e.clientX)}
          onPointerDown={(e) => pick(e.clientX)}
          onPointerLeave={() => setActive(null)}
          onBlur={() => setActive(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") setActive((a) => Math.min(last, (a ?? -1) + 1));
            else if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? last + 1) - 1));
            else return;
            e.preventDefault();
          }}
        >
          {/* Grid and y axis */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={PAD.left + plotWidth} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-fg-subtle text-[11px] tabular-nums">
                {t}
              </text>
            </g>
          ))}
          <line
            x1={PAD.left}
            x2={PAD.left + plotWidth}
            y1={y(0)}
            y2={y(0)}
            stroke="var(--chart-axis)"
            strokeWidth={1}
          />

          {/* X axis: one label per round */}
          {rounds.map((round, i) => (
            <text
              key={round.label}
              x={x(i)}
              y={HEIGHT - 8}
              textAnchor="middle"
              className="fill-fg-subtle text-[11px] font-semibold"
            >
              <title>{round.title}</title>
              {round.label}
            </text>
          ))}

          {/* Crosshair */}
          {active != null && (
            <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={y(0)} stroke="var(--chart-axis)" strokeWidth={1} />
          )}

          {/* Lines */}
          {drawOrder.map((s) => (
            <polyline
              key={s.id}
              fill="none"
              stroke={strokeFor(s.slot)}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
            />
          ))}

          {/* Leaders: end dot (with surface ring) and direct label */}
          {leaders.map((s) => (
            <g key={s.id}>
              <circle cx={x(last)} cy={y(s.values[last])} r={4} fill={strokeFor(s.slot)} stroke="var(--surface)" strokeWidth={2} />
              {showEndLabels && (
                <text x={x(last) + 10} y={y(s.values[last])} dy="0.32em" className="fill-fg text-xs font-semibold">
                  {s.name} · {s.values[last]}
                </text>
              )}
            </g>
          ))}

          {/* Active round: dots on every line */}
          {active != null &&
            drawOrder.map((s) => (
              <circle
                key={s.id}
                cx={x(active)}
                cy={y(s.values[active])}
                r={4}
                fill={strokeFor(s.slot)}
                stroke="var(--surface)"
                strokeWidth={2}
              />
            ))}
        </svg>

        {active != null && (
          <ChartTooltip
            title={rounds[active].title}
            className="top-2"
            style={x(active) > width / 2 ? { right: width - x(active) + 12 } : { left: x(active) + 12 }}
          >
            <ul className="flex flex-col gap-1">
              {readout.map((s) => (
                <li key={s.id} className="flex items-center gap-2">
                  <span aria-hidden className="h-0.5 w-3 shrink-0" style={{ background: strokeFor(s.slot) }} />
                  <span className="w-8 text-right font-bold tabular-nums text-fg">{s.value}</span>
                  <span className="text-fg-muted">{s.name}</span>
                </li>
              ))}
            </ul>
          </ChartTooltip>
        )}
      </div>
    </div>
  );
}
