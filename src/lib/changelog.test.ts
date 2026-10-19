import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { version } from "../../package.json";
import { changelogFile, compareVersions, parseChangelog } from "./changelog";

describe("parseChangelog", () => {
  const markdown = [
    "# Changelog",
    "",
    "Intro text.",
    "",
    "## [Unreleased]",
    "",
    "- Not out yet",
    "",
    "## [1.1.0] - 2026-10-15",
    "",
    "### Added",
    "- News",
    "",
    "## [1.0.0] - 2026-10-14",
    "",
    "First version.",
    "",
    "[Unreleased]: https://example.com/compare/v1.1.0...HEAD",
    "[1.1.0]: https://example.com/compare/v1.0.0...v1.1.0",
  ].join("\n");

  it("splits releases and skips the intro, Unreleased and compare links", () => {
    expect(parseChangelog(markdown)).toEqual([
      { version: "1.1.0", date: "2026-10-15", body: "### Added\n- News" },
      { version: "1.0.0", date: "2026-10-14", body: "First version." },
    ]);
  });

  it("handles Windows line endings", () => {
    expect(parseChangelog(markdown.replaceAll("\n", "\r\n"))).toHaveLength(2);
  });
});

describe("compareVersions", () => {
  it("compares numerically, part by part", () => {
    expect(compareVersions("1.10.0", "1.9.0")).toBeGreaterThan(0);
    expect(compareVersions("1.0.1", "1.1.0")).toBeLessThan(0);
    expect(compareVersions("2.0.0", "2.0.0")).toBe(0);
  });
});

describe("CHANGELOG files", () => {
  const read = (file: string) => parseChangelog(readFileSync(join(import.meta.dirname, "../..", file), "utf8"));
  const en = read(changelogFile.en);
  const es = read(changelogFile.es);

  it("list the same releases in both languages", () => {
    expect(es.map((r) => [r.version, r.date])).toEqual(en.map((r) => [r.version, r.date]));
  });

  it("start with the version in package.json", () => {
    expect(en[0]?.version).toBe(version);
  });

  it("go newest first", () => {
    for (let i = 1; i < en.length; i++) {
      expect(compareVersions(en[i - 1].version, en[i].version)).toBeGreaterThan(0);
      expect(en[i - 1].date >= en[i].date).toBe(true);
    }
  });

  it("have something under every release", () => {
    for (const release of [...en, ...es]) expect(release.body, release.version).not.toBe("");
  });
});
