import { siteConfig } from "@/config/site";

/**
 * <input type="datetime-local"> works in wall-clock time ("2026-11-14T19:30")
 * with no time zone. We store UTC and interpret/display wall-clock times in
 * siteConfig.timeZone (Madrid), whatever time zone the server runs in.
 */

const LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** Offset (ms) of `timeZone` from UTC at the given instant. */
function zoneOffset(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** "2026-11-14T19:30" (Madrid wall clock) → Date, or null if malformed. */
export function fromLocalInput(value: string, timeZone: string = siteConfig.timeZone): Date | null {
  const match = LOCAL_PATTERN.exec(value);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  const wallAsUtc = Date.UTC(y, mo - 1, d, h, mi);
  // First guess with the offset at that instant, then correct once for DST edges
  let result = wallAsUtc - zoneOffset(new Date(wallAsUtc), timeZone);
  result = wallAsUtc - zoneOffset(new Date(result), timeZone);
  return new Date(result);
}

/** Date → "2026-11-14T19:30" in Madrid wall-clock time, for input default values. */
export function toLocalInput(date: Date, timeZone: string = siteConfig.timeZone): string {
  const shifted = new Date(date.getTime() + zoneOffset(date, timeZone));
  return shifted.toISOString().slice(0, 16);
}
