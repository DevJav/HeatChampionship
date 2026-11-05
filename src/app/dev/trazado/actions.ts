"use server";

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { serializeGeometry } from "@/lib/race-log/geometry-edit";
import type { Anchor, TrackGeometry } from "@/lib/race-log/layout";

const DIR = path.join(process.cwd(), "src", "lib", "race-log");
const BLOCK = /export const (\w+): TrackGeometry = \{[\s\S]*?\n\};\n/;

const isNum = (v: unknown) => typeof v === "number" && Number.isFinite(v);
const isAnchor = (a: unknown): a is Anchor => Array.isArray(a) && a.length === 3 && a.every(isNum);

function valid(g: TrackGeometry) {
  return (
    isNum(g.width) &&
    isNum(g.height) &&
    isNum(g.halfWidth) &&
    typeof g.path === "string" &&
    /^M[-\d. L]+Z$/.test(g.path) &&
    Array.isArray(g.dividers) &&
    g.dividers.every(isAnchor) &&
    Array.isArray(g.spaces) &&
    g.spaces.length === g.dividers.length &&
    g.spaces.every(isAnchor) &&
    Array.isArray(g.badges) &&
    g.badges.every((b) => Array.isArray(b) && b.length === 2 && b.every(isNum))
  );
}

/**
 * Writes an edited geometry back into its track file in src/lib/race-log.
 * Development only: it rewrites source code, so it refuses to run anywhere
 * but `next dev`. The file is found by its layout's slug, never by a path
 * from the browser.
 */
export async function saveTrackGeometry(slug: string, geometry: TrackGeometry): Promise<{ ok: true; file: string } | { ok: false; error: string }> {
  if (process.env.NODE_ENV !== "development") return { ok: false, error: "Solo funciona con next dev." };
  if (!/^[a-z0-9-]+$/.test(slug)) return { ok: false, error: "Circuito no válido." };
  if (!valid(geometry)) return { ok: false, error: "El trazado no es válido." };

  const files = (await readdir(DIR)).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
  for (const file of files) {
    const full = path.join(DIR, file);
    const source = await readFile(full, "utf8");
    if (!source.includes(`slug: "${slug}"`)) continue;
    const match = source.match(BLOCK);
    if (!match) return { ok: false, error: `No encuentro el bloque TrackGeometry en ${file}.` };
    await writeFile(full, source.replace(BLOCK, serializeGeometry(match[1], geometry)));
    return { ok: true, file: `src/lib/race-log/${file}` };
  }
  return { ok: false, error: `No hay archivo de circuito con slug "${slug}".` };
}
