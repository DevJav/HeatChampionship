/** Emoji reactions on article comments. */

/** Offered in the picker before typing your own: racing, laughs and the usual. */
export const DEFAULT_REACTIONS = ["🏁", "🔥", "😂", "👏", "😮", "💀", "❤️", "👍"] as const;

const EMOJI_PART = /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u;
const NOT_EMOJI = /[\p{L}\p{N}\p{P}\s]/u;

/**
 * The first emoji in what the driver typed or pasted, or null if there's none.
 * Keeps whole graphemes, so flags (🇫🇷), skin tones (👍🏽) and families (👨‍👩‍👧) stay as one.
 */
export function parseReaction(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  for (const { segment } of new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(trimmed)) {
    if (isEmoji(segment)) return segment;
  }
  return null;
}

/** A single emoji grapheme, as stored in a reaction. */
export function isEmoji(value: string): boolean {
  if (value.length === 0 || value.length > 32) return false;
  const graphemes = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value)];
  if (graphemes.length !== 1 || !EMOJI_PART.test(value)) return false;
  // Keycaps (1️⃣) start with a digit; anything else with letters or punctuation isn't an emoji
  return /⃣/u.test(value) || !NOT_EMOJI.test(value.replace(/[‍️]/gu, ""));
}

export type ReactionRow = { emoji: string; user: { id: string; name: string } };
export type ReactionGroup = { emoji: string; count: number; mine: boolean; names: string[] };

/** One chip per emoji, in the order each was first used. */
export function groupReactions(rows: ReactionRow[], me: string | null): ReactionGroup[] {
  const groups = new Map<string, ReactionGroup>();
  for (const { emoji, user } of rows) {
    const group = groups.get(emoji) ?? { emoji, count: 0, mine: false, names: [] };
    group.count++;
    group.names.push(user.name);
    if (user.id === me) group.mine = true;
    groups.set(emoji, group);
  }
  return [...groups.values()];
}
