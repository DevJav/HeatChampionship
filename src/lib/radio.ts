/** Team radio: one short line per driver and race, written by the driver. */

export const RADIO_MAX = 140;

export class RadioError extends Error {}

/** Trimmed, single-spaced text, or null to clear it. Throws a RadioError when too long. */
export function cleanRadio(value: string, tooLong: string) {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length > RADIO_MAX) throw new RadioError(tooLong);
  return text || null;
}
