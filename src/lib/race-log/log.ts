import { z } from "zod";
import { finishLine, lapSpace, type TrackLayout } from "./layout";
import { driverInsights, rankHistory } from "./insights";
import { classification, gridPositions, isFinished, moves, type CarFlags, type LoggedRound, type Positions } from "./rounds";

/**
 * A race log as stored in RaceLog.data. Cars are listed in grid order and
 * identified by user id; names come from the users, so renames carry over.
 */

export type LogCar = {
  userId: string;
  /** CarColor id, copied to the results */
  colorId: string | null;
  /** Hex snapshot, so the log still draws if the colour is edited or removed */
  color: string;
};

/** The round being entered: who has been placed so far and where. */
export type Draft = { positions: Positions; placed: string[]; flags: Record<string, CarFlags> };

export type RaceLogData = {
  version: 1;
  /** Track.slug of the drawing used */
  track: string;
  laps: number;
  cars: LogCar[];
  /** Round 0 is the grid; each later entry is where every car ended that round */
  rounds: LoggedRound[];
  draft: Draft;
};

const MAX_ROUNDS = 200;

const carState = z.object({ pos: z.number().int().min(-20).max(1000), spot: z.union([z.literal(0), z.literal(1)]) });
const flags = z.object({ slipstream: z.boolean().optional(), spun: z.boolean().optional() });
const positions = z.record(z.string(), carState);
const flagMap = z.record(z.string(), flags);

export const raceLogSchema = z
  .object({
    version: z.literal(1),
    track: z.string().min(1).max(60),
    laps: z.number().int().min(1).max(10),
    cars: z
      .array(z.object({ userId: z.string().min(1), colorId: z.string().min(1).nullable(), color: z.string().regex(/^#[0-9a-f]{6}$/i) }))
      .min(2)
      .max(12),
    rounds: z.array(z.object({ positions, flags: flagMap })).min(1).max(MAX_ROUNDS),
    draft: z.object({ positions, placed: z.array(z.string()), flags: flagMap }),
  })
  .refine((log) => {
    // Every round and the draft cover exactly the logged cars
    const ids = new Set(log.cars.map((c) => c.userId));
    const same = (p: Record<string, unknown>) => Object.keys(p).length === ids.size && Object.keys(p).every((id) => ids.has(id));
    return ids.size === log.cars.length && log.rounds.every((r) => same(r.positions)) && same(log.draft.positions);
  });

/** Stored data that no longer parses is treated as no log rather than crashing the page. */
export function parseRaceLog(data: unknown): RaceLogData | null {
  const parsed = raceLogSchema.safeParse(data);
  return parsed.success ? (parsed.data as RaceLogData) : null;
}

export function newRaceLog(track: string, laps: number, cars: LogCar[]): RaceLogData {
  const grid = gridPositions(cars.map((c) => c.userId));
  return { version: 1, track, laps, cars, rounds: [{ positions: grid, flags: {} }], draft: { positions: grid, placed: [], flags: {} } };
}

export function isRaceOver(layout: TrackLayout, log: Pick<RaceLogData, "rounds">) {
  const last = log.rounds[log.rounds.length - 1].positions;
  return Object.values(last).every((car) => isFinished(layout, car));
}

/** Finishing order, spins and grid slots for pre-filling the results sheet (positions start at 1). */
export function resultsFromLog(layout: TrackLayout, log: RaceLogData) {
  const order = classification(layout, log.rounds);
  return log.cars.map((car, grid) => ({
    userId: car.userId,
    position: order.indexOf(car.userId) + 1,
    startPosition: grid + 1,
    spins: log.rounds.filter((r) => r.flags[car.userId]?.spun).length,
    carColorId: car.colorId,
  }));
}

export type DriverNames = Record<string, string>;

/** One row per driver and closed round: the shape of the CSV export. */
export function logRows(layout: TrackLayout, log: RaceLogData, names: DriverNames) {
  const ranks = rankHistory(layout, log.rounds);
  const end = finishLine(layout);
  return log.rounds.flatMap((round, r) => {
    const delta = r > 0 ? moves(log.rounds[r - 1].positions, round.positions) : {};
    return log.cars.map(({ userId }) => {
      const car = round.positions[userId];
      const finished = car.pos >= end;
      return {
        round: r,
        driver: names[userId] ?? userId,
        rank: ranks[r][userId],
        lap: finished ? layout.laps : Math.max(1, Math.floor(car.pos / layout.spacesPerLap) + 1),
        space: car.pos < 0 ? car.pos : lapSpace(layout, car.pos),
        total: car.pos,
        moved: r > 0 ? delta[userId] : 0,
        slipstream: !!round.flags[userId]?.slipstream,
        spun: !!round.flags[userId]?.spun,
        finished,
      };
    });
  });
}

function csvCell(value: string | number | boolean) {
  const text = String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function logCsv(layout: TrackLayout, log: RaceLogData, names: DriverNames) {
  const rows = logRows(layout, log, names);
  const header = ["round", "driver", "rank", "lap", "space", "total_spaces", "moved", "slipstream", "spun", "finished"];
  const lines = rows.map((r) => [r.round, r.driver, r.rank, r.lap, r.space, r.total, r.moved, r.slipstream, r.spun, r.finished].map(csvCell).join(","));
  return [header.join(","), ...lines].join("\n") + "\n";
}

/**
 * The log as a self-describing document: track facts, drivers, every round
 * with ranks and moves, the classification and per-driver stats. Meant to be
 * read by people and by an AI writing the race report.
 */
export function logExport(layout: TrackLayout, log: RaceLogData, names: DriverNames, race: { title: string; date: string; url: string }) {
  const order = classification(layout, log.rounds);
  const insights = driverInsights(layout, log.rounds);
  const rows = logRows(layout, log, names);
  const name = (id: string) => names[id] ?? id;
  return {
    race: { ...race, finished: isRaceOver(layout, log) },
    track: {
      slug: log.track,
      laps: layout.laps,
      spacesPerLap: layout.spacesPerLap,
      corners: layout.corners.map((c, i) => ({ number: i + 1, speedLimit: c.limit, beforeSpace: c.before })),
    },
    notes: [
      "Round 0 is the starting grid.",
      "space is the space within the lap counted from the start/finish line (negative on the grid); total_spaces keeps counting across laps.",
      "rank is the running order at the end of the round; moved is spaces advanced that round (negative after a spin-out).",
    ],
    drivers: log.cars.map((car, grid) => ({ name: name(car.userId), color: car.color, grid: grid + 1 })),
    rounds: log.rounds.map((_, r) => ({
      round: r,
      cars: rows
        .filter((row) => row.round === r)
        .sort((a, b) => a.rank - b.rank),
    })),
    classification: order.map((id, i) => ({ position: i + 1, driver: name(id) })),
    stats: insights.map(({ id, ...s }) => ({ driver: name(id), ...s, averageMove: Math.round(s.averageMove * 10) / 10 })),
  };
}

/** Letters drawn on each car: the initial, or the first two letters when initials clash. */
export function carLabels(names: DriverNames): Record<string, string> {
  const initial = (name: string) => name.trim().charAt(0).toUpperCase() || "?";
  const counts = new Map<string, number>();
  for (const name of Object.values(names)) counts.set(initial(name), (counts.get(initial(name)) ?? 0) + 1);
  return Object.fromEntries(
    Object.entries(names).map(([id, name]) => {
      const letter = initial(name);
      return [id, counts.get(letter)! > 1 ? letter + name.trim().charAt(1).toLowerCase() : letter];
    }),
  );
}
