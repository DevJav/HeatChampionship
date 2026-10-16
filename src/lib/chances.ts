/**
 * Pre-race chances, just for fun. Each driver gets a rating from
 * past results (recent races and this track count more, newcomers start near
 * average), then the race is simulated many times with a Plackett–Luce draw
 * (the next finisher is picked with probability proportional to strength)
 * to estimate each driver's chance of winning and of a podium.
 * Pure functions, unit-tested in chances.test.ts.
 */

import type { StatsRace } from "./stats";

/** Each older race counts this much less than the one after it */
const RECENCY = 0.85;
/** Races at the same track count this many times more */
const SAME_TRACK = 2;
/** Newcomers are pulled towards an average rating, as if they had this many average races */
const PRIOR_WEIGHT = 1.5;
/** How much a rating difference matters: strength = e^(SPREAD × rating) */
const SPREAD = 3.5;
const SIMULATIONS = 4000;

/**
 * 0 … 1 rating from a driver's finishes: 1 always wins, 0 always last.
 * `races` must be oldest first.
 */
export function driverRating(userId: string, races: StatsRace[], trackId: string) {
  let sum = 0.5 * PRIOR_WEIGHT;
  let weights = PRIOR_WEIGHT;
  let age = 0;
  for (let i = races.length - 1; i >= 0; i--) {
    const race = races[i];
    const result = race.results.find((r) => r.userId === userId);
    if (!result || race.results.length < 2) continue;
    const score = (race.results.length - result.position) / (race.results.length - 1);
    const weight = RECENCY ** age * (race.track.id === trackId ? SAME_TRACK : 1);
    sum += score * weight;
    weights += weight;
    age++;
  }
  return sum / weights;
}

/** Small seeded generator, so the same race shows the same numbers on every load. */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash = (text: string) => [...text].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

export type DriverChances = { userId: string; rating: number; win: number; podium: number };

/** Chance of a win and of a podium for each entrant, favourite first. `races` are finished races, oldest first. */
export function raceChances(entrantIds: string[], races: StatsRace[], trackId: string, seed = entrantIds.join()): DriverChances[] {
  const ratings = entrantIds.map((id) => driverRating(id, races, trackId));
  const strengths = ratings.map((r) => Math.exp(SPREAD * r));
  const wins = entrantIds.map(() => 0);
  const podiums = entrantIds.map(() => 0);
  const random = mulberry32(hash(seed));
  const podiumSize = Math.min(3, entrantIds.length);

  for (let s = 0; s < SIMULATIONS; s++) {
    const left = strengths.map((_, i) => i);
    let total = strengths.reduce((a, b) => a + b, 0);
    for (let place = 0; place < podiumSize; place++) {
      let roll = random() * total;
      let k = 0;
      while (k < left.length - 1 && (roll -= strengths[left[k]]) > 0) k++;
      const driver = left.splice(k, 1)[0];
      total -= strengths[driver];
      if (place === 0) wins[driver]++;
      podiums[driver]++;
    }
  }

  return entrantIds
    .map((userId, i) => ({ userId, rating: ratings[i], win: wins[i] / SIMULATIONS, podium: podiums[i] / SIMULATIONS }))
    .sort((a, b) => b.win - a.win || b.rating - a.rating);
}
