"use client";

import { useElementWidth } from "@/components/charts/useElementWidth";
import { t } from "@/i18n";

export type LapChartCar = { id: string; name: string; color: string };

const ROW = 26;
const PAD = { top: 14, right: 84, bottom: 26, left: 28 };

/**
 * Running order round by round, F1 lap-chart style: one line per car, the
 * leader on top. Clicking a round jumps the replay there.
 */
export function LapChart({
  cars,
  ranks,
  current,
  onPick,
}: {
  cars: LapChartCar[];
  /** Per round: car id → position */
  ranks: Record<string, number>[];
  current: number;
  onPick?: (round: number) => void;
}) {
  const [wrapper, width] = useElementWidth<HTMLDivElement>();
  const height = PAD.top + PAD.bottom + ROW * (cars.length - 1);
  const plotWidth = Math.max(width - PAD.left - PAD.right, 50);
  const last = Math.max(ranks.length - 1, 1);
  const x = (r: number) => PAD.left + (r / last) * plotWidth;
  const y = (rank: number) => PAD.top + (rank - 1) * ROW;
  const final = ranks[ranks.length - 1] ?? {};
  const labelEvery = Math.ceil(ranks.length / Math.max(1, Math.floor(plotWidth / 28)));

  function pick(clientX: number) {
    const box = wrapper.current?.getBoundingClientRect();
    if (!box || !onPick) return;
    onPick(Math.min(ranks.length - 1, Math.max(0, Math.round(((clientX - box.left - PAD.left) / plotWidth) * last))));
  }

  return (
    <div ref={wrapper} className="relative">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={t.raceLog.positionsByRound}
        className="block touch-pan-y"
        onPointerDown={(e) => pick(e.clientX)}
      >
        {cars.map((_, i) => (
          <text key={i} x={PAD.left - 10} y={y(i + 1)} dy="0.32em" textAnchor="end" className="fill-fg-subtle text-[11px] tabular-nums">
            {i + 1}
          </text>
        ))}
        {ranks.map((_, r) =>
          (r % labelEvery === 0 && last - r >= labelEvery) || r === last ? (
            <text key={r} x={x(r)} y={height - 6} textAnchor="middle" className="fill-fg-subtle text-[11px] tabular-nums">
              {r === 0 ? t.raceLog.startShort : r}
            </text>
          ) : null,
        )}
        <line x1={x(current)} x2={x(current)} y1={PAD.top - 8} y2={height - PAD.bottom + 8} stroke="var(--chart-axis)" strokeWidth={1} />

        {cars.map((car) => {
          const pts = ranks.map((rank, r) => `${x(r)},${y(rank[car.id])}`).join(" ");
          return (
            <g key={car.id}>
              {/* Dark underlay keeps pale cars (white, yellow) visible */}
              <polyline points={pts} fill="none" stroke="var(--fg)" strokeOpacity={0.35} strokeWidth={4.5} strokeLinejoin="round" />
              <polyline points={pts} fill="none" stroke={car.color} strokeWidth={2.5} strokeLinejoin="round" />
              <circle cx={x(current)} cy={y(ranks[current]?.[car.id] ?? 1)} r={4.5} fill={car.color} stroke="var(--fg)" strokeWidth={1} />
              <text x={x(last) + 10} y={y(final[car.id])} dy="0.32em" className="fill-fg text-xs font-semibold">
                {car.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
