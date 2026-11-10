import { REPLAY_RATE, type Shot } from "./director";

/**
 * Edits to the TV script, as the timeline makes them. Shots run back to back:
 * each ends where the next starts, so moving one edge moves its neighbour's
 * too. Every edit returns a new list and leaves the old one as it was, so
 * the timeline can undo. Times are in rounds of the race, like the shots.
 */

/** Shortest a shot can be, in rounds */
export const MIN_SHOT = 0.1;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const copy = (shots: Shot[]) => shots.map((shot) => ({ ...shot }));

/**
 * A shot starting later or earlier, like trimming a clip's head in a video
 * editor: a replay keeps its end and plays back from a later (or earlier) moment.
 */
function startAt(shot: Shot, start: number): Shot {
  const moved = { ...shot, start };
  if (shot.kind === "replay" && shot.of !== undefined) moved.of = Math.max(0, shot.of + (start - shot.start) * (shot.rate ?? REPLAY_RATE));
  return moved;
}

/** The shot playing at a time */
export function indexAt(shots: Shot[], t: number) {
  const i = shots.findIndex((shot) => t < shot.end);
  return i < 0 ? shots.length - 1 : i;
}

/** How long of the race a replay shows, in rounds */
export function sourceLength(shot: Shot) {
  return (shot.end - shot.start) * (shot.rate ?? REPLAY_RATE);
}

/**
 * Two shots from one at a time, the second like the first. A replay carries
 * on from where it was, so it plays the same as before the cut.
 */
export function splitAt(shots: Shot[], t: number): Shot[] | null {
  const i = indexAt(shots, t);
  const shot = shots[i];
  if (t < shot.start + MIN_SHOT || t > shot.end - MIN_SHOT) return null;
  const next = copy(shots);
  const second: Shot = { ...shot, start: t };
  if (shot.kind === "replay" && shot.of !== undefined) second.of = shot.of + (t - shot.start) * (shot.rate ?? REPLAY_RATE);
  next[i] = { ...shot, end: t };
  next.splice(i + 1, 0, second);
  return next;
}

/** Without a shot: the one before takes its time (the one after, for the first) */
export function removeShot(shots: Shot[], i: number): Shot[] | null {
  if (shots.length < 2) return null;
  const next = copy(shots);
  const [gone] = next.splice(i, 1);
  if (i === 0) next[0].start = gone.start;
  else next[i - 1].end = gone.end;
  return next;
}

/** Moves the cut between shot i − 1 and shot i, keeping both at least MIN_SHOT long */
export function moveCut(shots: Shot[], i: number, t: number): Shot[] {
  if (i <= 0 || i >= shots.length) return shots;
  const next = copy(shots);
  const at = clamp(t, next[i - 1].start + MIN_SHOT, next[i].end - MIN_SHOT);
  next[i - 1].end = at;
  next[i] = startAt(next[i], at);
  return next;
}

/** Slides a shot along, keeping its length: the shots either side give and take the time */
export function moveShot(shots: Shot[], i: number, start: number): Shot[] {
  if (i <= 0 || i >= shots.length - 1) return shots;
  const next = copy(shots);
  const length = next[i].end - next[i].start;
  const at = clamp(start, next[i - 1].start + MIN_SHOT, next[i + 1].end - MIN_SHOT - length);
  next[i - 1].end = at;
  next[i] = { ...next[i], start: at, end: at + length };
  next[i + 1].start = at + length;
  return next;
}

/** Sets where a shot ends, which is where the next one starts; the last shot always runs to the end */
export function setEnd(shots: Shot[], i: number, t: number): Shot[] {
  return moveCut(shots, i + 1, t);
}

export function patchShot(shots: Shot[], i: number, patch: Partial<Shot>): Shot[] {
  return shots.map((shot, j) => (j === i ? { ...shot, ...patch } : { ...shot }));
}

/**
 * A new shot from `start` for `length` rounds (less if the replay ends first),
 * laid over whatever was there: the shots it covers are trimmed or dropped.
 * Returns the list and where the new shot is in it.
 */
export function insertShot(shots: Shot[], shot: Omit<Shot, "start" | "end">, start: number, length: number) {
  const first = shots[0].start;
  const last = shots[shots.length - 1].end;
  const from = clamp(start, first, last - MIN_SHOT);
  const to = Math.min(last, from + Math.max(MIN_SHOT, length));
  const kept = shots.flatMap((s) => {
    if (s.end <= from || s.start >= to) return [{ ...s }];
    return [...(s.start < from ? [{ ...s, end: from }] : []), ...(s.end > to ? [startAt(s, to)] : [])];
  });
  const added: Shot = { ...shot, start: from, end: to };
  const all = [...kept, added].sort((a, b) => a.start - b.start);
  // A sliver left over either side would only flash: its neighbour takes it
  const tidy = all.reduce<Shot[]>((list, s) => {
    const previous = list.at(-1);
    if (previous && s !== added && s.end - s.start < MIN_SHOT) previous.end = s.end;
    else if (previous && previous !== added && previous.end - previous.start < MIN_SHOT && s === added) {
      list.pop();
      const before = list.at(-1);
      if (before) before.end = previous.end;
      list.push(s);
    } else list.push(s);
    return list;
  }, []);
  // Back to back, from the first start to the last end
  tidy[0].start = first;
  for (let i = 1; i < tidy.length; i++) tidy[i - 1].end = tidy[i].start;
  tidy[tidy.length - 1].end = last;
  return { shots: tidy, index: tidy.indexOf(added) };
}

/**
 * Makes a shot `length` long from where it starts: shorter hands the time to
 * the next shot, longer lays it over the shots after it.
 */
export function resize(shots: Shot[], i: number, length: number): Shot[] {
  const shot = shots[i];
  if (shot.start + length <= shot.end || i === shots.length - 1) return setEnd(shots, i, shot.start + length);
  const { start, end, ...rest } = shot;
  void end;
  return insertShot(shots, rest, start, length).shots;
}
