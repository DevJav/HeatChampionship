"use client";

import { useMemo, useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { saveResults } from "@/actions/results";
import { cn } from "@/lib/cn";
import type { ResultRow, ResultsValidation, RowField } from "@/lib/results-rules";
import { scoreRace } from "@/lib/scoring";
import { Alert, Avatar, Button, Input, Select } from "@/components/ui";
import { PositionBadge } from "@/components/domain/PositionBadge";

const RETIRED = "RET";

type Player = { id: string; name: string; image: string | null };
type Option = { id: string; name: string };

/** Editable row: selects hold strings ("" = not set). */
type DraftRow = {
  position: string;
  startPosition: string;
  carColorId: string;
  upgradeIds: string[];
  notes: string;
};

export type ResultsEditorProps = {
  raceId: string;
  players: Player[];
  carColors: (Option & { hex: string })[];
  upgrades: Option[];
  pointsTable: number[];
  /** Existing results by user id */
  initial: Record<string, Partial<DraftRow>>;
};

const emptyRow: DraftRow = { position: "", startPosition: "", carColorId: "", upgradeIds: [], notes: "" };

function toResultRow(userId: string, row: DraftRow): ResultRow {
  return {
    userId,
    position: row.position === RETIRED || row.position === "" ? null : Number(row.position),
    startPosition: row.startPosition ? Number(row.startPosition) : null,
    carColorId: row.carColorId || null,
    upgradeIds: row.upgradeIds,
    notes: row.notes.trim() || null,
  };
}

export function ResultsEditor({ raceId, players, carColors, upgrades, pointsTable, initial }: ResultsEditorProps) {
  const [rows, setRows] = useState<Record<string, DraftRow>>(() =>
    Object.fromEntries(players.map((p) => [p.id, { ...emptyRow, ...initial[p.id] }])),
  );
  const [validation, setValidation] = useState<ResultsValidation>({ rowErrors: {} });
  const [pending, startTransition] = useTransition();

  const update = (userId: string, patch: Partial<DraftRow>) => {
    setRows((current) => ({ ...current, [userId]: { ...current[userId], ...patch } }));
    // Editing a field clears that field's errors on every row (duplicates involve
    // several rows); the whole sheet is re-validated on save
    setValidation((current) => ({
      rowErrors: Object.fromEntries(
        Object.entries(current.rowErrors)
          .map(([id, errors]) => [id, Object.fromEntries(Object.entries(errors).filter(([field]) => !(field in patch)))])
          .filter(([, errors]) => Object.keys(errors).length > 0),
      ),
    }));
  };

  const toggleUpgrade = (userId: string, upgradeId: string) => {
    const selected = rows[userId].upgradeIds;
    update(userId, {
      upgradeIds: selected.includes(upgradeId)
        ? selected.filter((id) => id !== upgradeId)
        : [...selected, upgradeId],
    });
  };

  const points = useMemo(
    () => scoreRace(players.map((p) => toResultRow(p.id, rows[p.id])), pointsTable),
    [players, rows, pointsTable],
  );

  function submit() {
    // An empty position is a missing answer, not a retirement
    const missing = players.filter((p) => rows[p.id].position === "");
    if (missing.length > 0) {
      setValidation({
        error: "Indica la posición de todos los pilotos (o márcalos como retirados).",
        rowErrors: Object.fromEntries(missing.map((p) => [p.id, { position: "Falta la posición." }])),
      });
      return;
    }
    startTransition(async () => {
      // Redirects to the race page on success
      setValidation(await saveResults(raceId, players.map((p) => toResultRow(p.id, rows[p.id]))));
    });
  }

  const positions = players.map((_, i) => String(i + 1));
  const errorFor = (userId: string, field: RowField) => validation.rowErrors[userId]?.[field];

  return (
    <div className="flex flex-col gap-5">
      {validation.error && <Alert tone="danger">{validation.error}</Alert>}

      <ol className="flex flex-col gap-3">
        {players.map((player) => {
          const row = rows[player.id];
          const color = carColors.find((c) => c.id === row.carColorId);
          const finishing = row.position && row.position !== RETIRED ? Number(row.position) : null;
          return (
            <li key={player.id} className="flex flex-col gap-3 border-l-4 border-primary bg-surface-2/60 p-3">
              <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(10rem,1.4fr)_repeat(3,minmax(0,1fr))_4rem]">
                <div className="flex items-center gap-2 self-center font-semibold">
                  <Avatar name={player.name} src={player.image} color={color?.hex} size="sm" />
                  {player.name}
                </div>

                <SelectCell label="Posición" error={errorFor(player.id, "position")}>
                  <Select
                    aria-label={`Posición de ${player.name}`}
                    value={row.position}
                    aria-invalid={!!errorFor(player.id, "position")}
                    onChange={(e) => update(player.id, { position: e.target.value })}
                  >
                    <option value="">—</option>
                    {positions.map((p) => (
                      <option key={p} value={p}>
                        {p}º
                      </option>
                    ))}
                    <option value={RETIRED}>Retirado</option>
                  </Select>
                </SelectCell>

                <SelectCell label="Salida" error={errorFor(player.id, "startPosition")}>
                  <Select
                    aria-label={`Salida de ${player.name}`}
                    value={row.startPosition}
                    aria-invalid={!!errorFor(player.id, "startPosition")}
                    onChange={(e) => update(player.id, { startPosition: e.target.value })}
                  >
                    <option value="">—</option>
                    {positions.map((p) => (
                      <option key={p} value={p}>
                        {p}º
                      </option>
                    ))}
                  </Select>
                </SelectCell>

                <SelectCell label="Coche" error={errorFor(player.id, "carColorId")}>
                  <Select
                    aria-label={`Coche de ${player.name}`}
                    value={row.carColorId}
                    aria-invalid={!!errorFor(player.id, "carColorId")}
                    onChange={(e) => update(player.id, { carColorId: e.target.value })}
                  >
                    <option value="">—</option>
                    {carColors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </SelectCell>

                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-fg-muted">Pts</span>
                  <div className="flex items-center gap-1">
                    {finishing && finishing <= 3 && <PositionBadge position={finishing} size="sm" />}
                    <span className="font-display text-2xl font-bold italic tabular-nums">
                      {points.get(player.id) ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              {upgrades.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-xs font-bold uppercase tracking-wider text-fg-muted">Mejoras</span>
                  {upgrades.map((upgrade) => {
                    const on = row.upgradeIds.includes(upgrade.id);
                    return (
                      <button
                        key={upgrade.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleUpgrade(player.id, upgrade.id)}
                        className={cn(
                          "clip-slant focus-inset px-3 py-1 text-xs font-bold uppercase italic transition-colors",
                          on ? "bg-primary text-primary-fg" : "bg-border text-fg-muted hover:bg-border-strong",
                        )}
                      >
                        {upgrade.name}
                      </button>
                    );
                  })}
                </div>
              )}

              <Input
                aria-label={`Nota sobre ${player.name}`}
                placeholder="Nota (opcional): trompo en la curva 3, remontada épica…"
                value={row.notes}
                maxLength={300}
                onChange={(e) => update(player.id, { notes: e.target.value })}
                className="h-9"
              />
            </li>
          );
        })}
      </ol>

      {upgrades.length === 0 && (
        <p className="text-sm text-fg-muted">
          No hay mejoras en el catálogo. Añádelas en Administración › Mejoras para registrar cuáles usa cada piloto.
        </p>
      )}

      <div className="flex justify-end border-t border-border pt-4">
        <Button size="lg" loading={pending} onClick={submit}>
          <Flag /> Guardar resultados
        </Button>
      </div>
    </div>
  );
}

function SelectCell({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-bold uppercase tracking-wider text-fg-muted">{label}</span>
      {children}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
