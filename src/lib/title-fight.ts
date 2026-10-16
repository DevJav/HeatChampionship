/**
 * The championship maths for an unfinished season: points still up for
 * grabs, who can still be champion, and what the leader needs to seal it at
 * the next race. Ties are settled by countback, which isn't modelled, so the
 * sums stay on the safe side: matching the leader keeps you alive, and
 * sealing it means getting strictly out of reach.
 * Pure functions, unit-tested in title-fight.test.ts.
 */

export type TitleRow = { userId: string; points: number };

export type Contender = TitleRow & { maxPoints: number; gap: number };

export type TitleFight = {
  remaining: number;
  pointsLeft: number;
  /** Drivers who can still be champion, leader first */
  contenders: Contender[];
  /** Champion already, whatever happens */
  decided: boolean;
  /**
   * Worst finish at the next race that makes the leader champion even if the
   * closest rival wins it (or takes 2nd behind the leader); null if no finish does.
   */
  clinchPosition: number | null;
};

/** `rows` in standings order; `remaining` = races still to run; `table` = points per position. */
export function titleFight(rows: TitleRow[], table: number[], remaining: number): TitleFight | null {
  if (remaining <= 0 || rows.length === 0 || table.length === 0) return null;
  const best = table[0];
  const pts = (position: number) => table[position - 1] ?? 0;
  const pointsLeft = remaining * best;
  const [leader, ...rivals] = rows;

  const contenders = rows
    .map((row) => ({ ...row, maxPoints: row.points + pointsLeft, gap: leader.points - row.points }))
    .filter((row) => row.maxPoints >= leader.points);
  const rival = rivals[0];
  const decided = !rival || leader.points > rival.points + pointsLeft;

  let clinchPosition: number | null = null;
  if (!decided) {
    // From the worst finish up: the rival takes the best place left for them
    for (let position = table.length + 1; position >= 1; position--) {
      const rivalNext = position === 1 ? pts(2) : pts(1);
      if (leader.points + pts(position) > rival.points + rivalNext + best * (remaining - 1)) {
        clinchPosition = position;
        break;
      }
    }
  }
  return { remaining, pointsLeft, contenders, decided, clinchPosition };
}
