/**
 * The race dossier: everything needed to write a race report (or a preview)
 * as one Markdown document, downloaded by the organiser from production and
 * pasted into a chat with an AI or a person writing the article. Labels are
 * in English like the race log export; the content is whatever the site holds.
 * Pure: builds the text from already-gathered data (see lib/data/dossier.ts).
 */

export type DossierInput = {
  site: { name: string; language: string };
  race: {
    title: string;
    season: string;
    round: number;
    track: string;
    date: string;
    location: string | null;
    laps: number | null;
    notes: string | null;
    url: string;
    finished: boolean;
  };
  entrants: string[];
  results: {
    position: number;
    driver: string;
    grid: number | null;
    spins: number;
    points: number;
    car: string | null;
    upgrades: string[];
    note: string | null;
    radio: string | null;
  }[];
  chances: { driver: string; win: number; podium: number }[];
  log: {
    rounds: number;
    winner: string | null;
    /** The official winner, when the log disagrees with it */
    officialWinner: string | null;
    wireToWire: boolean;
    lastGasp: boolean;
    moment: { driver: string; round: number; from: number; to: number } | null;
    rivalry: { a: string; b: string; swaps: number; close: number } | null;
    drivers: { driver: string; overtakes: number; slipstreams: number; spins: number; averageMove: number; bestMove: number; roundsLed: number }[];
    corners: { corner: number; limit: number; passes: number; spins: number; slipstreams: number }[];
    /** Running order after each round, driver → ranks (round 0 = grid) */
    order: { driver: string; ranks: number[] }[];
  } | null;
  standings: { rank: number; driver: string; points: number; gap: number; wins: number; podiums: number; movement: number | null }[];
  titleFight: { remaining: number; pointsLeft: number; decided: boolean; leader: string; clinchPosition: number | null; contenders: { driver: string; points: number; maxPoints: number }[] } | null;
  season: { rounds: { round: number; track: string }[]; rows: { driver: string; finishes: (number | null)[] }[] };
  trackHistory: { season: string; round: number; date: string; podium: string[] }[];
  careers: { driver: string; starts: number; wins: number; podiums: number }[];
  achievements: { driver: string; name: string; description: string }[];
  driverOfTheDay: { status: "open" | "closed" | "none"; closesAt: string | null; votes: number; voters: number; winners: { driver: string; votes: number }[] };
  predictions: { revealed: boolean; count: number; rows: { who: string; picks: string[]; points: number | null; perfect: boolean }[] };
};

const cell = (value: string | number | null | undefined) => (value == null || value === "" ? "–" : String(value).replace(/\|/g, "\\|").replace(/\n/g, " "));

function table(head: string[], rows: (string | number | null | undefined)[][]) {
  if (rows.length === 0) return "_None._\n";
  return [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rows.map((r) => `| ${r.map(cell).join(" | ")} |`)].join("\n") + "\n";
}

const pct = (p: number) => `${Math.round(p * 100)}%`;
const signed = (n: number | null) => (n == null ? null : n > 0 ? `+${n}` : String(n));

export function raceDossier(d: DossierInput): string {
  const { race } = d;
  const out: string[] = [];
  const add = (...lines: string[]) => out.push(...lines);

  add(
    `# ${race.finished ? "Race report dossier" : "Race preview dossier"}: ${race.title} (${race.season})`,
    "",
    `Site: ${d.site.name} · language of the site: **${d.site.language}** (write the article in it) · ${race.url}`,
    "",
    "## The race",
    "",
    `- Track: ${race.track} · round ${race.round} of ${race.season}`,
    `- Date: ${race.date}${race.location ? ` · at ${race.location}` : ""}${race.laps ? ` · ${race.laps} laps` : ""}`,
    ...(race.notes ? [`- Organiser's notes: ${race.notes}`] : []),
    "",
  );

  if (race.finished) {
    add(
      "## Results",
      "",
      table(
        ["Pos", "Driver", "Grid", "Gained", "Spins", "Pts", "Car", "Upgrades", "Organiser note"],
        d.results.map((r) => [r.position, r.driver, r.grid, signed(r.grid == null ? null : r.grid - r.position), r.spins, r.points, r.car, r.upgrades.join(", "), r.note]),
      ),
    );
    const radio = d.results.filter((r) => r.radio);
    add("## Team radio (the drivers' own words)", "", ...(radio.length ? radio.map((r) => `- **${r.driver}**: “${r.radio}”`) : ["_Nobody said anything._"]), "");
  } else {
    add("## Entrants", "", d.entrants.length ? d.entrants.map((e) => `- ${e}`).join("\n") + "\n" : "_Nobody yet._\n");
    if (d.chances.length) {
      add(
        "## Chances (simulated from recent form and history at this track)",
        "",
        table(["Driver", "Win", "Podium"], d.chances.map((c) => [c.driver, pct(c.win), pct(c.podium)])),
      );
    }
  }

  if (d.log) {
    const l = d.log;
    add("## Round by round (logged at the table)", "", `- ${l.rounds} rounds logged.`);
    if (l.winner) add(`- Winner on the log: ${l.winner}${l.wireToWire ? " · led every round" : ""}${l.lastGasp ? " · took the lead in the final round" : ""}.`);
    if (l.officialWinner) {
      add(`- ⚠️ The log's finishing order disagrees with the official results (official winner: ${l.officialWinner}). Trust the results above for who finished where; use the log for how the race unfolded, and say so if it matters.`);
    }
    if (l.moment) add(`- Moment of the race: ${l.moment.driver} went from ${l.moment.from} to ${l.moment.to} in round ${l.moment.round}.`);
    if (l.rivalry) add(`- Rivalry of the race: ${l.rivalry.a} vs ${l.rivalry.b}, swapped places ${l.rivalry.swaps} times, ${l.rivalry.close} rounds side by side.`);
    add(
      "",
      "### Per driver",
      "",
      table(
        ["Driver", "Places gained (all passes)", "Slipstreams", "Spins", "Avg spaces/round", "Best move", "Rounds led"],
        l.drivers.map((x) => [x.driver, x.overtakes, x.slipstreams, x.spins, Math.round(x.averageMove * 10) / 10, x.bestMove, x.roundsLed]),
      ),
      "### Corners (passes count where the move was completed; spins at the corner being taken)",
      "",
      table(["Corner", "Speed limit", "Passes", "Spins", "Slipstreams"], l.corners.map((c) => [c.corner, c.limit, c.passes, c.spins, c.slipstreams])),
      "### Running order after each round (R0 = grid)",
      "",
      table(["Driver", ...l.order[0].ranks.map((_, i) => `R${i}`)], l.order.map((o) => [o.driver, ...o.ranks])),
    );
  }

  add(
    `## Championship ${race.finished ? "after this race" : "before this race"}`,
    "",
    table(
      ["#", "Driver", "Pts", "Gap", "Wins", "Podiums", "Move"],
      d.standings.map((s) => [s.rank, s.driver, s.points, s.gap ? `-${s.gap}` : "", s.wins, s.podiums, signed(s.movement)]),
    ),
  );
  if (d.titleFight) {
    const f = d.titleFight;
    add(
      "### Title fight",
      "",
      `- ${f.remaining} race(s) left, ${f.pointsLeft} points up for grabs.`,
      f.decided
        ? `- ${f.leader} is already champion, mathematically.`
        : f.clinchPosition
          ? `- ${f.leader} is champion at the next race by finishing ${f.clinchPosition} or better (even if the closest rival wins).`
          : `- ${f.leader} can't seal the title at the next race yet.`,
      `- Still in the fight: ${f.contenders.map((c) => `${c.driver} (${c.points}, max ${c.maxPoints})`).join(", ")}.`,
      "",
    );
  }
  if (d.season.rounds.length) {
    add(
      "### Season so far (finishing positions)",
      "",
      table(["Driver", ...d.season.rounds.map((r) => `R${r.round} ${r.track}`)], d.season.rows.map((r) => [r.driver, ...r.finishes])),
    );
  }

  add(
    `## History at ${race.track}`,
    "",
    table(["Season", "Round", "Date", "1st", "2nd", "3rd"], d.trackHistory.map((h) => [h.season, h.round, h.date, ...h.podium])),
    `## Careers of this race's drivers${race.finished ? " (including this race)" : ""}`,
    "",
    table(["Driver", "Starts", "Wins", "Podiums"], d.careers.map((c) => [c.driver, c.starts, c.wins, c.podiums])),
  );

  if (race.finished) {
    add("## Achievements unlocked in this race", "", ...(d.achievements.length ? d.achievements.map((a) => `- ${a.driver}: **${a.name}** (${a.description})`) : ["_None._"]), "");
    const v = d.driverOfTheDay;
    add(
      "## Driver of the Day",
      "",
      v.status === "closed"
        ? v.winners.length
          ? `- Winner: ${v.winners.map((w) => `${w.driver} (${w.votes} votes)`).join(", ")} · ${v.votes} of ${v.voters} drivers voted.`
          : "- Nobody voted."
        : `- Voting still open until ${v.closesAt} (${v.votes} of ${v.voters} drivers have voted; the tally is secret until then).`,
      "",
    );
  }

  const p = d.predictions;
  add("## Podium predictions", "");
  if (!p.revealed) add(`- ${p.count} prediction(s) made; picks stay private until the start.`, "");
  else
    add(
      table(
        ["Who", "1st", "2nd", "3rd", ...(race.finished ? ["Pts"] : [])],
        p.rows.map((r) => [r.who, ...r.picks, ...(race.finished ? [r.perfect ? `${r.points} (exact podium!)` : r.points] : [])]),
      ),
    );

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
