import type { ArticleCategory, ArticleStatus } from "@/generated/prisma/client";

/**
 * Articles are Markdown (GitHub flavor: tables, autolinks…) plus two additions:
 *
 * - Mentions: `@username` inline links to the driver, shown with their color.
 * - Embeds: a line on its own like `{{resultados:<raceId> | Ronda 3 · Italia}}`
 *   renders a live block (race card, results table…). The text after `|` is
 *   only a reminder for whoever edits the Markdown; it's ignored.
 */

type Tone = "neutral" | "primary" | "accent" | "success" | "warning" | "danger" | "info" | "bar";

export const ARTICLE_CATEGORY: Record<ArticleCategory, { label: string; plural: string; param: string; tone: Tone }> = {
  PREVIEW: { label: "Previa", plural: "Previas", param: "previas", tone: "accent" },
  REPORT: { label: "Crónica", plural: "Crónicas", param: "cronicas", tone: "primary" },
  NEWS: { label: "Novedades", plural: "Novedades", param: "novedades", tone: "info" },
  RULES: { label: "Reglamento", plural: "Reglamento", param: "reglamento", tone: "bar" },
};

export const ARTICLE_CATEGORIES = Object.keys(ARTICLE_CATEGORY) as ArticleCategory[];

/** "cronicas" → "REPORT"; null for unknown values. */
export function categoryFromParam(param: unknown): ArticleCategory | null {
  return ARTICLE_CATEGORIES.find((category) => ARTICLE_CATEGORY[category].param === param) ?? null;
}

export const ARTICLE_STATUS: Record<ArticleStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "Borrador", tone: "neutral" },
  PUBLISHED: { label: "Publicado", tone: "success" },
};

/** Longest comment allowed, in characters */
export const COMMENT_MAX = 2000;

// ---------------------------------------------------------------------------
// Embeds
// ---------------------------------------------------------------------------

export const EMBED_KINDS = {
  /** Race card: date, track, seats or winner */
  carrera: "race",
  /** Race classification table */
  resultados: "race",
  /** Race podium */
  podio: "race",
  /** Championship standings right after a race */
  "clasificacion-tras": "race",
  /** Live standings of a season; the current one without an id */
  clasificacion: "season",
  /** Driver card */
  piloto: "username",
} as const;

export type EmbedKind = keyof typeof EMBED_KINDS;
export type Embed = { kind: EmbedKind; ref: string | null; source: string };

const EMBED_LINE = /^\{\{\s*([a-z-]+)\s*(?::\s*([^|}]*?))?\s*(?:\|[^}]*)?\}\}$/;

function parseEmbed(line: string): Embed | null {
  const match = EMBED_LINE.exec(line.trim());
  if (!match || !(match[1] in EMBED_KINDS)) return null;
  return { kind: match[1] as EmbedKind, ref: match[2] || null, source: line.trim() };
}

/** `{{kind:ref | label}}`, ready to paste on its own line. */
export function embedSnippet(kind: EmbedKind, ref?: string | null, label?: string) {
  return `{{${kind}${ref ? `:${ref}` : ""}${label ? ` | ${label.replace(/[{}|]/g, "")}` : ""}}}`;
}

export type ArticleSegment = { type: "markdown"; text: string } | { type: "embed"; embed: Embed };

/** Markdown chunks and the embed lines between them. Embeds inside code fences stay as code. */
export function splitArticle(body: string): ArticleSegment[] {
  const segments: ArticleSegment[] = [];
  let buffer: string[] = [];
  let fence: string | null = null;

  const flush = () => {
    const text = buffer.join("\n");
    if (text.trim()) segments.push({ type: "markdown", text });
    buffer = [];
  };

  for (const line of body.replace(/\r\n?/g, "\n").split("\n")) {
    const fenceMatch = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      if (!fence) fence = fenceMatch[1][0];
      else if (fenceMatch[1][0] === fence) fence = null;
    }
    const embed = fence ? null : parseEmbed(line);
    if (embed) {
      flush();
      segments.push({ type: "embed", embed });
    } else {
      buffer.push(line);
    }
  }
  flush();
  return segments;
}

// ---------------------------------------------------------------------------
// Mentions
// ---------------------------------------------------------------------------

/**
 * `@username` not preceded by a word character (so emails don't match).
 * Usernames may contain dots, but a trailing one is punctuation: "¡Bien, @ana.!"
 */
export const MENTION_PATTERN = /(?<![\w@])@([a-z0-9_](?:[a-z0-9_.]*[a-z0-9_])?)/gi;

/** Lowercased usernames mentioned anywhere in the text. */
export function mentionedUsernames(text: string): string[] {
  return [...new Set(Array.from(text.matchAll(MENTION_PATTERN), (m) => m[1].toLowerCase()))];
}

/** Drivers an article points at: @mentions plus driver-card embeds (lowercased usernames). */
export function referencedUsernames(body: string): string[] {
  const cards = splitArticle(body).flatMap((segment) =>
    segment.type === "embed" && segment.embed.kind === "piloto" && segment.embed.ref ? [segment.embed.ref.toLowerCase()] : [],
  );
  return [...new Set([...mentionedUsernames(body), ...cards])];
}

/** Plain-text summary for previews when the article has no excerpt. */
export function plainExcerpt(body: string, max = 180) {
  const text = splitArticle(body)
    .filter((segment) => segment.type === "markdown")
    .map((segment) => segment.text)
    .join(" ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s*(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/^\s*\|.*\|\s*$/gm, " ")
    .replace(/[*_~`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  const cut = text.lastIndexOf(" ", max);
  return `${text.slice(0, cut > 0 ? cut : max).replace(/[,.;:]$/, "")}…`;
}

// ---------------------------------------------------------------------------
// Mention suggestions (while typing)
// ---------------------------------------------------------------------------

export type MentionCandidate = { name: string; username: string; color: string | null };

/** "Lucía" → "lucia", so suggestions ignore case and accents. */
const fold = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * The mention being typed at the end of `beforeCaret`: where its "@" is and what
 * follows it. Null when the caret isn't right after "@something" (no spaces).
 */
export function mentionQueryAt(beforeCaret: string): { start: number; query: string } | null {
  const match = /(?<![\w@])@([\p{L}\p{N}_.]{0,30})$/u.exec(beforeCaret);
  return match ? { start: match.index, query: match[1] } : null;
}

/** Drivers matching a partial mention, best first: username or a name word starting with it, then containing it. */
export function filterMentionCandidates<T extends MentionCandidate>(drivers: T[], query: string): T[] {
  const q = fold(query);
  if (!q) return drivers;
  const score = (driver: T) => {
    const username = driver.username.toLowerCase();
    const name = fold(driver.name);
    if (username.startsWith(q) || name.split(/\s+/).some((word) => word.startsWith(q))) return 0;
    if (username.includes(q) || name.includes(q)) return 1;
    return null;
  };
  return drivers
    .map((driver) => ({ driver, rank: score(driver) }))
    .filter((entry) => entry.rank != null)
    .sort((a, b) => a.rank! - b.rank!)
    .map((entry) => entry.driver);
}
