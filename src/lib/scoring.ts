/** Championship scoring — pure functions, unit-tested in scoring.test.ts. */

export type ScoringEntry = {
  userId: string;
  /** Finishing position (1 = winner); null when retired */
  position: number | null;
};

/**
 * Points for each player: pointsTable[position - 1], or 0 when the position
 * is past the end of the table or the player retired.
 * pointsTable [9, 6, 4, 3, 2, 1] → 1st 9 pts, 6th 1 pt, 7th+ 0.
 */
export function scoreRace(entries: ScoringEntry[], pointsTable: number[]): Map<string, number> {
  return new Map(
    entries.map((entry) => [
      entry.userId,
      entry.position == null ? 0 : (pointsTable[entry.position - 1] ?? 0),
    ]),
  );
}

/** Positions gained from the starting grid (positive = moved up). */
export function positionsGained(startPosition: number | null, position: number | null) {
  if (startPosition == null || position == null) return null;
  return startPosition - position;
}

/** Reads a season's pointsTable JSON defensively. */
export function parsePointsTable(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((n): n is number => Number.isInteger(n) && n >= 0) : [];
}
