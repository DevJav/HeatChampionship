/**
 * The changelog: CHANGELOG.md (English) and CHANGELOG.es.md (Spanish) at the repo root,
 * in Keep a Changelog style, shown on /novedades in the site's language.
 */
import type { Locale } from "@/i18n";

/** One release: the "## [1.2.0] - 2026-10-15" heading and the Markdown under it. */
export type Release = {
  version: string;
  /** yyyy-mm-dd */
  date: string;
  body: string;
};

export const changelogFile: Record<Locale, string> = {
  en: "CHANGELOG.md",
  es: "CHANGELOG.es.md",
};

const RELEASE_HEADING = /^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})\s*$/;
/** "[1.2.0]: https://…" compare links at the end of the file */
const LINK_DEFINITION = /^\[[^\]]+\]:\s/;

/**
 * Releases in file order (newest first). The intro and any "## [Unreleased]"
 * section are skipped, as are the compare links at the bottom.
 */
export function parseChangelog(markdown: string): Release[] {
  const releases: { version: string; date: string; lines: string[] }[] = [];
  let current: (typeof releases)[number] | undefined;

  for (const line of markdown.split(/\r?\n/)) {
    if (line.startsWith("## ")) {
      const match = RELEASE_HEADING.exec(line);
      current = match ? { version: match[1], date: match[2], lines: [] } : undefined;
      if (current) releases.push(current);
    } else if (current && !LINK_DEFINITION.test(line)) {
      current.lines.push(line);
    }
  }

  return releases.map(({ version, date, lines }) => ({ version, date, body: lines.join("\n").trim() }));
}

/** Negative when a < b, for "1.10.0" vs "1.9.0" style versions. */
export function compareVersions(a: string, b: string) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}
