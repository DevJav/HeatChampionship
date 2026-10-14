/** Validation for a race's results sheet — pure, unit-tested in results-rules.test.ts. */

export type ResultRow = {
  userId: string;
  /** Finishing position — everyone finishes in Heat */
  position: number;
  /** Spin-outs (trompos) during the race */
  spins: number;
  startPosition: number | null;
  carColorId: string | null;
  upgradeIds: string[];
  notes: string | null;
};

export type RowField = "position" | "spins" | "startPosition" | "carColorId";

export type ResultsValidation = {
  /** Problem with the sheet as a whole */
  error?: string;
  /** Problems per player and field */
  rowErrors: Record<string, Partial<Record<RowField, string>>>;
};

/** Upper bound for a driver's spin-outs in one race */
export const MAX_SPINS = 20;

function duplicates<T>(values: T[]) {
  const seen = new Set<T>();
  const dupes = new Set<T>();
  for (const value of values) {
    if (seen.has(value)) dupes.add(value);
    seen.add(value);
  }
  return dupes;
}

export function validateResults(rows: ResultRow[]): ResultsValidation {
  const rowErrors: ResultsValidation["rowErrors"] = {};
  const flag = (userId: string, field: RowField, message: string) => {
    rowErrors[userId] = { ...rowErrors[userId], [field]: message };
  };

  if (rows.length === 0) return { error: "No hay pilotos en la carrera.", rowErrors };

  // Finishing positions: everyone finishes, so unique and within 1..n (hence exactly 1..n)
  const repeatedPositions = duplicates(rows.map((row) => row.position));
  for (const row of rows) {
    if (row.position < 1 || row.position > rows.length) flag(row.userId, "position", "Posición no válida.");
    else if (repeatedPositions.has(row.position)) flag(row.userId, "position", "Posición repetida.");
  }

  for (const row of rows) {
    if (row.spins < 0 || row.spins > MAX_SPINS) flag(row.userId, "spins", "Trompos no válidos.");
  }

  // Starting grid: optional, but unique and within the field size
  const starters = rows.filter((row) => row.startPosition != null);
  const repeatedStarts = duplicates(starters.map((row) => row.startPosition));
  for (const row of starters) {
    if (row.startPosition! < 1 || row.startPosition! > rows.length) {
      flag(row.userId, "startPosition", "Posición de salida no válida.");
    } else if (repeatedStarts.has(row.startPosition)) {
      flag(row.userId, "startPosition", "Salida repetida.");
    }
  }

  // Car colors: optional, one car per color
  const repeatedColors = duplicates(rows.filter((row) => row.carColorId).map((row) => row.carColorId));
  for (const row of rows) {
    if (row.carColorId && repeatedColors.has(row.carColorId)) flag(row.userId, "carColorId", "Color repetido.");
  }

  const error = Object.keys(rowErrors).length > 0 ? "Revisa los campos marcados." : undefined;
  return { error, rowErrors };
}
