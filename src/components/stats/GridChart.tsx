"use client";

import { useState } from "react";
import { niceTicks } from "@/lib/chart-scale";
import { formatDecimal, formatPercent } from "@/lib/format";
import type { Tally } from "@/lib/stats";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { useElementWidth } from "@/components/charts/useElementWidth";
import { t } from "@/i18n";

export type GridSlot = Tally & { startPosition: number };

const HEIGHT = 240;
const PAD = { top: 24, right: 8, bottom: 28, left: 44 };
const BAR_MAX = 24;
const RADIUS = 4;

/** Column with a rounded data end and a square base. */
function columnPath(x: number, y: number, width: number, height: number) {
  const r = Math.min(RADIUS, height, width / 2);
  return `M${x},${y + height} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${y + height} Z`;
}

/** Win rate from each starting slot: does the grid decide the race? */
export function GridChart({ slots }: { slots: GridSlot[] }) {
  const [wrapper, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const plotWidth = Math.max(width - PAD.left - PAD.right, 50);
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const ticks = niceTicks(Math.max(0, ...slots.map((s) => Math.round(s.winRate * 100))));
  const max = ticks[ticks.length - 1];
  const band = plotWidth / slots.length;
  const barWidth = Math.min(BAR_MAX, band * 0.6);
  const center = (i: number) => PAD.left + band * i + band / 2;
  const y = (percent: number) => PAD.top + plotHeight - (percent / max) * plotHeight;
  const last = slots.length - 1;

  const slot = active == null ? null : slots[active];

  return (
    <div ref={wrapper} className="relative">
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={t.stats.gridChart.label}
        tabIndex={0}
        className="block max-w-full touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={PAD.left + plotWidth} y1={y(tick)} y2={y(tick)} stroke="var(--chart-grid)" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-fg-subtle text-[11px] tabular-nums">
              {formatPercent(tick / 100)}
            </text>
          </g>
        ))}

        {slots.map((s, i) => {
          const percent = s.winRate * 100;
          const top = y(percent);
          const height = y(0) - top;
          return (
            <g key={s.startPosition}>
              {/* Hit target: the whole band, not just the column */}
              <rect
                x={PAD.left + band * i}
                y={PAD.top}
                width={band}
                height={plotHeight}
                fill={active === i ? "var(--surface-2)" : "transparent"}
                onPointerEnter={() => setActive(i)}
                onPointerDown={() => setActive(i)}
              />
              {height > 0 && (
                <path
                  d={columnPath(center(i) - barWidth / 2, top, barWidth, height)}
                  fill="var(--series-1)"
                  className="pointer-events-none"
                />
              )}
              {s.uses > 0 && (
                <text
                  x={center(i)}
                  y={top - 6}
                  textAnchor="middle"
                  className="pointer-events-none fill-fg-muted text-[11px] font-semibold tabular-nums"
                >
                  {formatPercent(s.winRate)}
                </text>
              )}
              <text
                x={center(i)}
                y={HEIGHT - 8}
                textAnchor="middle"
                className="pointer-events-none fill-fg-subtle text-[11px] font-semibold"
              >
                {t.common.ordinal(s.startPosition)}
              </text>
            </g>
          );
        })}

        <line x1={PAD.left} x2={PAD.left + plotWidth} y1={y(0)} y2={y(0)} stroke="var(--chart-axis)" strokeWidth={1} />
      </svg>

      {slot && active != null && (
        <ChartTooltip
          title={t.stats.gridChart.startingFrom(t.common.ordinal(slot.startPosition))}
          className="top-2"
          style={center(active) > width / 2 ? { right: width - center(active) + 16 } : { left: center(active) + 16 }}
        >
          {slot.uses === 0 ? (
            <p className="text-fg-muted">{t.stats.gridChart.nobody}</p>
          ) : (
            <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-fg-muted">
              <dt>{t.stats.starts}</dt>
              <dd className="text-right font-bold text-fg tabular-nums">{slot.uses}</dd>
              <dt>{t.common.columns.wins}</dt>
              <dd className="text-right font-bold text-fg tabular-nums">
                {slot.wins} ({formatPercent(slot.winRate)})
              </dd>
              <dt>{t.common.columns.podiums}</dt>
              <dd className="text-right font-bold text-fg tabular-nums">{slot.podiums}</dd>
              <dt>{t.stats.gridChart.averageFinish}</dt>
              <dd className="text-right font-bold text-fg tabular-nums">
                {slot.averageFinish == null ? "—" : formatDecimal(slot.averageFinish)}
              </dd>
            </dl>
          )}
        </ChartTooltip>
      )}
    </div>
  );
}
