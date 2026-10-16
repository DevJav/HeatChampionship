import { connection } from "next/server";
import { siteConfig } from "@/config/site";
import { locale } from "@/i18n";
import { ACHIEVEMENT_BY_ID } from "../achievements";
import { raceChances } from "../chances";
import { db } from "../db";
import type { DossierInput } from "../dossier";
import { tallyVotes, votingClosesAt, votingPhase } from "../driver-of-the-day";
import { formatDate, formatDateTime, formatRaceDay } from "../format";
import { picksRevealed, podiumOf, scorePicks } from "../predictions";
import { cornerStats } from "../race-log/corners";
import { momentOfTheRace, pairDuels, raceHighlights, rivalryOfTheRace } from "../race-log/highlights";
import { driverInsights, rankHistory } from "../race-log/insights";
import { trackDrawing } from "../race-log/tracks";
import { raceTitle } from "../races";
import { parsePointsTable } from "../scoring";
import { absoluteUrl } from "../site-url";
import { titleFight } from "../title-fight";
import { getAchievements } from "./achievements";
import { getDotdVotes } from "./driver-of-the-day";
import { getRacePredictions } from "./predictions";
import { getRaceLog } from "./race-logs";
import { getRace } from "./races";
import { getRaceResults } from "./results";
import { getSeasonStandings } from "./standings";
import { getStatsData } from "./stats";

/** Everything the race dossier needs, or null for an unknown or draft race. */
export async function getDossierInput(raceId: string): Promise<DossierInput | null> {
  await connection();
  const race = await getRace(raceId);
  if (!race) return null;
  const finished = race.status === "FINISHED";
  const now = new Date();

  const [results, stats, saved, standings, laterRaces, { unlocks }, votes, predictions] = await Promise.all([
    finished ? getRaceResults(race.id) : Promise.resolve([]),
    getStatsData(),
    getRaceLog(race.id),
    // After this race when it's finished, before it otherwise
    getSeasonStandings(race.seasonId, { throughRound: finished ? race.round : race.round - 1 }),
    db.race.count({ where: { seasonId: race.seasonId, status: { not: "DRAFT" }, round: finished ? { gt: race.round } : { gte: race.round } } }),
    getAchievements(),
    getDotdVotes(race.id),
    getRacePredictions(race.id),
  ]);

  // Names for everyone who might appear: past drivers, entrants, this race's results
  const names = new Map<string, string>([...stats.drivers].map(([id, d]) => [id, d.name]));
  for (const r of race.registrations) names.set(r.user.id, r.user.name);
  for (const r of results) names.set(r.user.id, r.user.name);
  if (saved) for (const [id, name] of Object.entries(saved.names)) names.set(id, name);
  const name = (id: string) => names.get(id) ?? "?";

  const entrants = race.registrations.filter((r) => r.status === "CONFIRMED").map((r) => r.user);
  const driverIds = finished ? results.map((r) => r.user.id) : entrants.map((e) => e.id);
  const past = stats.races.filter((r) => r.scheduledAt < race.scheduledAt && r.id !== race.id);
  const upToHere = stats.races.filter((r) => r.scheduledAt <= race.scheduledAt);

  // The race log, when it was logged on a traced track
  let log: DossierInput["log"] = null;
  const layout = saved && trackDrawing(saved.log.track, saved.log.laps)?.layout;
  if (saved && layout && saved.log.rounds.length > 1) {
    const rounds = saved.log.rounds;
    const highlights = raceHighlights(layout, rounds);
    const moment = momentOfTheRace(layout, rounds);
    const rivalry = rivalryOfTheRace(pairDuels(layout, rounds));
    const ranks = rankHistory(layout, rounds);
    log = {
      rounds: rounds.length - 1,
      winner: highlights.winner && name(highlights.winner),
      officialWinner: (() => {
        const official = results.find((r) => r.position === 1)?.user.id;
        return finished && highlights.winner && official && official !== highlights.winner ? name(official) : null;
      })(),
      wireToWire: highlights.wireToWire,
      lastGasp: highlights.lastGasp,
      moment: moment && { driver: name(moment.userId), round: moment.round, from: moment.from, to: moment.to },
      rivalry: rivalry && { a: name(rivalry.a), b: name(rivalry.b), swaps: rivalry.swaps, close: rivalry.close },
      drivers: driverInsights(layout, rounds).map(({ id, ...s }) => ({ driver: name(id), ...s })),
      corners: cornerStats(layout, rounds).map((c, i) => ({ corner: i + 1, limit: layout.corners[i].limit, ...c })),
      order: saved.log.cars.map((car) => ({ driver: name(car.userId), ranks: ranks.map((r) => r[car.userId]) })),
    };
  }

  const table = parsePointsTable(race.season.pointsTable);
  const fight = finished && race.season.status === "FINISHED" ? null : titleFight(standings.rows, table, laterRaces);

  const phase = votingPhase(race, now);
  const tally = tallyVotes(votes);

  return {
    site: { name: siteConfig.name, language: locale === "en" ? "English" : "Spanish" },
    race: {
      title: raceTitle(race),
      season: race.season.name,
      round: race.round,
      track: race.track.name,
      date: formatRaceDay(race.scheduledAt),
      location: race.location,
      laps: race.laps ?? race.track.defaultLaps,
      notes: race.notes,
      url: absoluteUrl(`/carreras/${race.id}`),
      finished,
    },
    entrants: entrants.map((e) => e.name),
    results: results.map((r) => ({
      position: r.position,
      driver: r.user.name,
      grid: r.startPosition,
      spins: r.spins,
      points: r.points,
      car: r.carColor?.name ?? null,
      upgrades: r.upgrades.map((u) => u.upgrade.name),
      note: r.notes,
      radio: r.radio,
    })),
    chances:
      !finished && entrants.length >= 3
        ? raceChances(entrants.map((e) => e.id), stats.races, race.track.id, race.id).map((c) => ({ driver: name(c.userId), win: c.win, podium: c.podium }))
        : [],
    log,
    standings: standings.rows.map((s) => ({ rank: s.rank, driver: name(s.userId), points: s.points, gap: s.gap, wins: s.wins, podiums: s.podiums, movement: s.movement })),
    titleFight: fight && {
      remaining: fight.remaining,
      pointsLeft: fight.pointsLeft,
      decided: fight.decided,
      leader: name(fight.contenders[0].userId),
      clinchPosition: fight.clinchPosition,
      contenders: fight.contenders.map((c) => ({ driver: name(c.userId), points: c.points, maxPoints: c.maxPoints })),
    },
    season: {
      rounds: standings.races.map((r) => ({ round: r.round, track: r.track.name })),
      rows: standings.rows.map((s) => ({ driver: name(s.userId), finishes: standings.races.map((r) => s.positions[r.id] ?? null) })),
    },
    trackHistory: past
      .filter((r) => r.track.id === race.track.id)
      .map((r) => ({ season: r.season.name, round: r.round, date: formatDate(r.scheduledAt), podium: podiumOf(r.results).map(name) })),
    careers: driverIds.map((id) => {
      const mine = upToHere.flatMap((r) => r.results.filter((x) => x.userId === id));
      return { driver: name(id), starts: mine.length, wins: mine.filter((x) => x.position === 1).length, podiums: mine.filter((x) => x.position <= 3).length };
    }),
    achievements: unlocks
      .filter((u) => u.race?.id === race.id)
      .map((u) => {
        const a = ACHIEVEMENT_BY_ID.get(u.achievementId)!;
        return { driver: name(u.userId), name: a.name, description: a.description };
      }),
    driverOfTheDay: {
      status: phase === "not-started" ? "none" : phase,
      closesAt: votingClosesAt(race) && formatDateTime(votingClosesAt(race)!),
      votes: votes.length,
      voters: results.length,
      // The tally stays secret while voting is open
      winners: phase === "closed" ? tally.winners.map((id) => ({ driver: name(id), votes: tally.most })) : [],
    },
    predictions: {
      revealed: picksRevealed(race, now),
      count: predictions.length,
      rows: picksRevealed(race, now)
        ? predictions.map((p) => {
            const score = finished ? scorePicks(p.picks, podiumOf(results.map((r) => ({ userId: r.user.id, position: r.position })))) : null;
            return { who: p.user.name, picks: p.names, points: score?.points ?? null, perfect: score?.perfect ?? false };
          }).sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
        : [],
    },
  };
}
