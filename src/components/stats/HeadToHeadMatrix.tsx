"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { duelStep, type Duel } from "@/lib/stats";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { DriverName } from "@/components/domain/DriverName";

export type MatrixDriver = { id: string; name: string; username: string | null; color: string | null; code: string };

type HeadToHeadMatrixProps = {
  drivers: MatrixDriver[];
  /** duels[row][column] = how the row driver fared against the column driver */
  duels: Record<string, Record<string, Duel>>;
};

const STEPS = [-3, -2, -1, 0, 1, 2, 3];

/** Diverging fill: red = usually behind, gray = even, blue = usually ahead. */
const fillFor = (step: number) =>
  step === 0 ? "var(--diverging-mid)" : `var(--diverging-${step > 0 ? "pos" : "neg"}-${Math.abs(step)})`;
/** The darkest steps take white text (contrast checked in tokens.css) */
const inkFor = (step: number) => (Math.abs(step) === 3 ? "#ffffff" : "var(--fg)");

type Active = { row: number; col: number; left?: number; right?: number; top: number };

/**
 * Who finishes ahead of whom: each cell reads "ahead–behind" for the row driver
 * against the column driver, colored on a diverging scale.
 * Hover, or focus and use the arrow keys, for the full readout.
 */
export function HeadToHeadMatrix({ drivers, duels }: HeadToHeadMatrixProps) {
  const outer = useRef<HTMLDivElement>(null);
  const cells = useRef(new Map<string, HTMLElement>());
  const [active, setActive] = useState<Active | null>(null);
  const last = drivers.length - 1;

  function activate(row: number, col: number) {
    const cell = cells.current.get(`${row}:${col}`);
    const box = outer.current?.getBoundingClientRect();
    if (!cell || !box) return;
    cell.scrollIntoView({ block: "nearest", inline: "nearest" });
    const rect = cell.getBoundingClientRect();
    const center = rect.left + rect.width / 2 - box.left;
    setActive({
      row,
      col,
      top: rect.bottom - box.top + 6,
      ...(center > box.width / 2 ? { right: box.right - rect.right } : { left: rect.left - box.left }),
    });
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const moves: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    if (!active) return activate(0, 1);
    let row = active.row + move[0];
    let col = active.col + move[1];
    // Step over the diagonal (a driver against themself)
    if (row === col) {
      row += move[0];
      col += move[1];
    }
    if (row < 0 || col < 0 || row > last || col > last) return;
    activate(row, col);
  }

  const rowDriver = active && drivers[active.row];
  const colDriver = active && drivers[active.col];
  const duel = rowDriver && colDriver ? duels[rowDriver.id]?.[colDriver.id] : undefined;

  return (
    <div ref={outer} className="relative flex flex-col gap-4">
      <div
        tabIndex={0}
        role="group"
        aria-label="Cara a cara. Usa las flechas para recorrer las casillas."
        className="overflow-x-auto outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onKeyDown={onKeyDown}
        onFocus={(e) => e.target === e.currentTarget && !active && activate(0, 1)}
        onBlur={() => setActive(null)}
        onPointerLeave={() => setActive(null)}
      >
        <table className="border-separate border-spacing-0.5 text-sm">
          <thead>
            <tr>
              <th scope="col" className="sr-only">
                Piloto
              </th>
              {drivers.map((d, col) => (
                <th
                  key={d.id}
                  scope="col"
                  title={d.name}
                  className={cn(
                    "w-11 pb-1 font-display text-xs font-bold italic italic-center tracking-wide text-fg-muted sm:w-14",
                    active?.col === col && "text-primary",
                  )}
                >
                  <span data-driver={d.username ?? undefined}>{d.code}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {drivers.map((rowD, row) => (
              <tr key={rowD.id}>
                <th scope="row" className={cn("pr-3 text-left font-normal", active?.row === row && "text-primary")}>
                  <DriverName name={rowD.name} username={rowD.username} link={false} color={rowD.color} className="max-sm:hidden" />
                  <DriverName name={rowD.code} username={rowD.username} link={false} color={rowD.color} className="sm:hidden" />
                </th>
                {drivers.map((colD, col) => {
                  if (row === col) {
                    return (
                      <td key={colD.id} aria-label="—" className="bg-surface-2 p-0">
                        <span aria-hidden className="block h-10 w-11 chequered opacity-20 sm:h-11 sm:w-14" />
                      </td>
                    );
                  }
                  const d = duels[rowD.id]?.[colD.id];
                  const step = d ? duelStep(d) : 0;
                  const isActive = active?.row === row && active.col === col;
                  return (
                    <td
                      key={colD.id}
                      ref={(el) => {
                        if (el) cells.current.set(`${row}:${col}`, el);
                        else cells.current.delete(`${row}:${col}`);
                      }}
                      onPointerEnter={() => activate(row, col)}
                      className={cn(
                        "h-10 w-11 p-0 text-center text-xs font-bold tabular-nums sm:h-11 sm:w-14 sm:text-sm",
                        !d && "border border-dashed border-border text-fg-subtle",
                        isActive && "outline-2 -outline-offset-2 outline-fg",
                      )}
                      style={d ? { background: fillFor(step), color: inkFor(step) } : undefined}
                    >
                      {d ? `${d.ahead}–${d.behind}` : <span className="sr-only">Sin carreras juntos</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
        <span>Casi siempre detrás</span>
        <span aria-hidden className="flex gap-0.5">
          {STEPS.map((step) => (
            <span key={step} className="h-3 w-5" style={{ background: fillFor(step) }} />
          ))}
        </span>
        <span>Casi siempre delante</span>
      </div>

      {active && rowDriver && colDriver && (
        <ChartTooltip
          title={`${rowDriver.name} vs ${colDriver.name}`}
          style={{ top: active.top, left: active.left, right: active.right }}
        >
          {duel ? (
            <ul className="flex flex-col gap-0.5 text-fg-muted">
              <li>
                <span className="font-bold text-fg tabular-nums">{duel.meetings}</span>{" "}
                {duel.meetings === 1 ? "carrera juntos" : "carreras juntos"}
              </li>
              <li>
                {rowDriver.name} por delante: <span className="font-bold text-fg tabular-nums">{duel.ahead}</span>
              </li>
              <li>
                {colDriver.name} por delante: <span className="font-bold text-fg tabular-nums">{duel.behind}</span>
              </li>
              {duel.meetings > duel.ahead + duel.behind && (
                <li>
                  Abandonaron los dos:{" "}
                  <span className="font-bold text-fg tabular-nums">{duel.meetings - duel.ahead - duel.behind}</span>
                </li>
              )}
            </ul>
          ) : (
            <p className="text-fg-muted">Aún no han coincidido en una carrera.</p>
          )}
        </ChartTooltip>
      )}
    </div>
  );
}
