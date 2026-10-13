import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** Titillium Web for generated images (next/og needs .woff/.ttf, not woff2). OFL: assets/fonts/LICENSE-TitilliumWeb.txt */
export async function ogFonts() {
  const dir = join(process.cwd(), "assets/fonts");
  const [bold, regular] = await Promise.all([
    readFile(join(dir, "titillium-web-latin-700-italic.woff")),
    readFile(join(dir, "titillium-web-latin-400-normal.woff")),
  ]);
  return [
    { name: "Titillium", data: bold, weight: 700 as const, style: "italic" as const },
    { name: "Titillium", data: regular, weight: 400 as const, style: "normal" as const },
  ];
}

export const OG_SIZE = { width: 1200, height: 630 };
