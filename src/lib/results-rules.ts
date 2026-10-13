/** Validation for a race's results sheet — pure, unit-tested in results-rules.test.ts. */

export type ResultRow = {
  userId: string;
  /** Finishing position; null = retired */
  position: number | null;
  startPosition: number | null;
  carColorId: string | null;
  upgradeIds: string[];
  notes: string | null;
};

export type RowField = "position" | "startPosition" | "carColorId";

export type ResultsValidation = {
  /** Problem with the sheet as a whole */
  error?: string;
  /** Problems per player and field */
  rowErrors: Record<string, Partial<Record<RowField, string>>>;
};

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

  // Finishing positions: unique and 1..k without gaps (k = finishers)
  const finishers = rows.filter((row) => row.position != null);
  const repeatedPositions = duplicates(finishers.map((row) => row.position));
  for (const row of finishers) {
    if (row.position! < 1 || row.position! > rows.length) flag(row.userId, "position", "Posición no válida.");
    else if (repeatedPositions.has(row.position)) flag(row.userId, "position", "Posición repetida.");
  }
  let error: string | undefined;
  if (finishers.length === 0) {
    error = "Indica al menos un piloto que haya terminado.";
  } else if (Object.keys(rowErrors).length === 0) {
    const expected = finishers.map((_, i) => i + 1).join(",");
    const actual = finishers.map((row) => row.position!).sort((a, b) => a - b).join(",");
    if (expected !== actual) {
      error = `Las posiciones deben ir de 1 a ${finishers.length} sin huecos (los retirados no cuentan).`;
    }
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

  if (!error && Object.keys(rowErrors).length > 0) error = "Revisa los campos marcados.";
  return { error, rowErrors };
}
