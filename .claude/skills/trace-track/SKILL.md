---
name: trace-track
description: Trace a new Heat board (circuit) from a photo so it can be recorded round by round and shows a Track map, like USA, France and Great Britain. Use when the user sends a board or track-card photo and asks to add a map/track/circuit.
---

# Trace a Heat board into the race log

Goal: a new `src/lib/race-log/<track>.ts` with a `TrackLayout` (rules) and a
`TrackGeometry` (drawing), registered in `src/lib/race-log/tracks.ts`. Examples
to copy: `usa.ts`, `france.ts`, `great-britain.ts`.

## What you need from the user

1. **A photo of the board** (top-down, whole track visible). This is what gets traced.
   Best: an official or straight-on image with **no cars or tokens on the track**.
   Cars on the track make fake dividers, and tokens or crowds touching the track bend
   the centre line. A sharper photo doesn't help if it has those (Great Britain: a
   1247 px photo with cars on it traced worse than a clean 1024 px one). If you have
   several photos, trace each one and keep the cleanest `debug.png`.
2. **The track card** (the small card). It is the source of truth for the numbers:
   - header: laps (flag icon), spaces per lap, number of corners;
   - corner badges with their speed limits;
   - black boxes = spaces **between** two corner lines (they add up to the spaces per lap).
   If the user only sends the board, ask for the card or read these off the board
   and get the user to confirm them. Badges can look upside down on the board
   (a 6 reads as a 9 on Great Britain), so check them against the card.

Images pasted in chat are saved under the session's `images/` folder (path in the
message). Copy the board photo into the scratchpad, never into the repo.

## Conventions (agreed with the user)

- Corners are **lines between spaces**. `before: n` = the corner line sits just before space n.
- Space 0 is the first space past the start/finish line (the chequered line). The grid
  fills the spaces behind it, pole on space `spacesPerLap - 1`.
- The small numbers beside each space = spaces left before the next corner line,
  0 on the last space before the line. Pole shows the number for space 0 plus 1.
  `spacesToCorner` in `layout.ts` reproduces them: use them to check the trace.
- Racing line = the thicker white border; it is stored per stretch (from one corner to
  the next), seen in the direction of travel. It only matters for drawing. Photos make
  it a guess: always say it still needs confirming on the real board.
- Orange, yellow or tan lines across the track are usually ordinary dividers or corner
  lines; some corner lines are white. Ignore the red dotted kerbs.
- Each space holds 2 cars.

## Steps

1. **Read the card** and write down: laps, spaces per lap, corners in race order with
   their limits, and the stretch lengths. Check that the stretches add up.

2. **Pick three points on the board photo** (original pixel coordinates; crop and zoom
   with PIL to read them):
   - `--seed`: plain asphalt, away from lines and dashes;
   - `--start`: on the start/finish line;
   - `--ahead`: a bit further along in the direction of travel (the grid cars point that way).

3. **Run the tracer** (Python with numpy, opencv, scikit-image, pillow, networkx; run it
   with plain `python3`, not `-I`, or it won't find the packages):

   ```sh
   G=<scratchpad>/<track>
   python3 scripts/trace-track.py $G/board.png --seed X,Y --start X,Y --ahead X,Y \
     --spaces <spaces per lap> --out $G/t1
   ```

   It writes `mask.png`, `debug.png` (centre line, numbered spaces, red dividers, green
   start line), `geometry.json` and `report.txt`. Knobs when it goes wrong:
   - not one clean ring in `mask.png`: `--tol` (colour tolerance, 22–30) and
     `--close` (5–9; too big merges stretches that run side by side, too small leaves
     corner lines cutting the ring). Great Britain: `--tol 28 --close 7`.
   - the count is off: the report flags spaces about twice the median length and splits
     them automatically; lower `--line-score` if real dividers are missed, raise
     `--min-gap` if there are extra ones (cars on the grid can make fake lines).
   - centre line cuts inside a hairpin: lower `--smooth`.
   - a small bump in the centre line: usually an orange number box beside the track
     that got into the mask (orange counts as track so corner lines are covered). A
     small bump is fine. Masking only lines enclosed by asphalt was tried and made
     the tracing worse.
   - the whole board turns white in `mask.png`: the surroundings are sand or orange
     (Italy), so pass `--no-orange-track`. Italy: `--tol 25 --close 7 --no-orange-track`.
   - a fake divider (a car's outline across the track) or a corner line placed badly
     (on tight hairpins the score can peak twice, either side of the real line): remove
     dividers by index with `--drop i,j` (numbers from the previous `debug.png`) and
     place one with `--add x,y` (traced pixels, i.e. original × the report's scale).
     Italy's corner 2: `--drop 19,20 --add 433,271`. Record these flags in the
     track file's comment so the trace can be reproduced.
   - getting the right count isn't enough: check in `debug.png` that the purple line
     stays in the middle of the asphalt.
   - the printed numbers count down to 0, so a stretch has one more space than the
     highest number in it (Italy: 37, 8, 6 → 38 + 9 + 7 = 54). The user may give you
     the highest numbers: add one to each before checking the total.

4. **Check debug.png** by cropping it into 2–4 zoomed pieces and reading them:
   divider count = spaces per lap, divider 0 on the start line, the line going the right
   way, and each corner line's divider index. The corner indices must give the card's
   stretch lengths. Then rerun with `--corners i,j,k,…` (those indices, in race order)
   to get a racing-line guess per stretch, and look at the borders in zoomed crops of
   the photo to confirm it.

5. **Touch up by hand if needed** (after step 7, once the track is registered): with
   `next dev` running, `/dev/trazado` lets you or the user drag the centre-line points,
   the dividers and the badges over the board photo (load the same photo that was
   traced), smooth a stretch, check the live preview and **Save** straight into the
   track file (only the geometry block is rewritten; dev only). Use it for wobbles
   from cars or tokens rather than fighting the tracer's knobs. Mention in the file's
   comment that it was hand-tuned.

6. **Write `src/lib/race-log/<track>.ts`** from `geometry.json` (same shape and comments
   as `great-britain.ts`). Add the `badges`: one `[x, y]` per corner, in race order, at
   the corner's speed-limit badge on the photo, multiplied by the scale in `report.txt`
   (the traced image is 1000 px wide). Layout `slug` = the Spanish seed slug.

7. **Register it** in `src/lib/race-log/tracks.ts` under both seed slugs (Spanish and
   English, from `prisma/seed-content.ts`, e.g. `gran-bretana` and `great-britain`).

8. **Tests**: add the track to the `traced tracks` table in
   `src/lib/race-log/layout.test.ts`, plus a `spacesToCorner` case that matches the
   numbers printed on the board (space 0, pole, and the space after each corner line).
   `log.test.ts` checks `trackDrawing` by slug: add the new slug there too.
   Run `npx vitest run src/lib/race-log` and `npx tsc --noEmit`.

9. **Look at it in the app**: with `next dev` running, open `/circuitos/<slug>` and
   screenshot the **Track map** (e.g. `agent-browser open …`, `agent-browser screenshot …`).
   Compare the numbers beside the spaces with the board.

10. **Update the texts that list the traced tracks**: `noDrawingDescription` in
   `src/i18n/es.ts` and `src/i18n/en.ts`, and the "have a map" sentence in `docs/tour.md`.

11. **Changelog** (standing rule): an entry under Unreleased in both `CHANGELOG.md`
    (`### Added`) and `CHANGELOG.es.md` (`### Nuevo`), written for the drivers. A new track
    is a minor release when the user asks to cut one (see `docs/development.md#releases`).

12. Tell the user which racing-line sides were guesses, so they can check them on the board.
