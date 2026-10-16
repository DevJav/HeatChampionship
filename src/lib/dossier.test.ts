import { describe, expect, it } from "vitest";
import { raceDossier, type DossierInput } from "./dossier";

const base: DossierInput = {
  site: { name: "Heat Championship", language: "Spanish" },
  race: { title: "Ronda 2 · Italia", season: "2026/27", round: 2, track: "Italia", date: "sábado, 14 de noviembre", location: "Casa de Ana", laps: 2, notes: null, url: "https://example.com/carreras/r2", finished: true },
  entrants: [],
  results: [
    { position: 1, driver: "Ana", grid: 4, spins: 0, points: 9, car: "Azul", upgrades: ["Turbo"], note: null, radio: "Ni una carta | buena" },
    { position: 2, driver: "Leo", grid: 1, spins: 1, points: 6, car: null, upgrades: [], note: "Trompo en la 3", radio: null },
  ],
  chances: [],
  log: null,
  standings: [{ rank: 1, driver: "Ana", points: 18, gap: 0, wins: 2, podiums: 2, movement: 1 }],
  titleFight: { remaining: 1, pointsLeft: 9, decided: false, leader: "Ana", clinchPosition: 2, contenders: [{ driver: "Ana", points: 18, maxPoints: 27 }] },
  season: { rounds: [{ round: 1, track: "USA" }], rows: [{ driver: "Ana", finishes: [1] }] },
  trackHistory: [],
  careers: [{ driver: "Ana", starts: 5, wins: 2, podiums: 3 }],
  achievements: [{ driver: "Ana", name: "Remontada", description: "Ganó 3 puestos." }],
  driverOfTheDay: { status: "open", closesAt: "21 nov", votes: 1, voters: 2, winners: [] },
  predictions: { revealed: true, count: 1, rows: [{ who: "Zoe", picks: ["Ana", "Leo", "Eva"], points: 6, perfect: false }] },
};

describe("raceDossier", () => {
  it("writes a report dossier with results, radio and context", () => {
    const md = raceDossier(base);
    expect(md).toContain("# Race report dossier: Ronda 2 · Italia (2026/27)");
    expect(md).toContain("language of the site: **Spanish**");
    expect(md).toContain("| 1 | Ana | 4 | +3 | 0 | 9 | Azul | Turbo | – |");
    expect(md).toContain("- **Ana**: “Ni una carta | buena”");
    expect(md).toContain("Ana is champion at the next race by finishing 2 or better");
    expect(md).toContain("tally is secret until then");
    expect(md).toContain("| Zoe | Ana | Leo | Eva | 6 |");
  });

  it("warns when the log and the official results disagree on the winner", () => {
    const log: NonNullable<DossierInput["log"]> = {
      rounds: 2, winner: "Leo", officialWinner: "Ana", wireToWire: false, lastGasp: false, moment: null, rivalry: null, drivers: [], corners: [],
      order: [{ driver: "Ana", ranks: [1, 2, 2] }],
    };
    expect(raceDossier({ ...base, log })).toContain("disagrees with the official results (official winner: Ana)");
    expect(raceDossier({ ...base, log: { ...log, officialWinner: null } })).not.toContain("disagrees");
  });

  it("escapes pipes inside table cells", () => {
    const md = raceDossier({ ...base, results: [{ ...base.results[0], note: "a | b" }] });
    expect(md).toContain("a \\| b");
  });

  it("writes a preview for a race not run yet", () => {
    const md = raceDossier({
      ...base,
      race: { ...base.race, finished: false },
      results: [],
      entrants: ["Ana", "Leo"],
      chances: [{ driver: "Ana", win: 0.6, podium: 0.9 }],
      predictions: { revealed: false, count: 3, rows: [] },
    });
    expect(md).toContain("# Race preview dossier");
    expect(md).toContain("| Ana | 60% | 90% |");
    expect(md).toContain("3 prediction(s) made; picks stay private");
    expect(md).not.toContain("## Results");
  });
});
