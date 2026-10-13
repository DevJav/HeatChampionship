/**
 * Generates the app icons from the logo (red slanted tile + flame):
 *   src/app/icon.svg            browser tab (Next.js serves it as the favicon)
 *   src/app/apple-icon.png      iOS home screen (180×180)
 *   public/icons/icon-*.png     web app manifest (Android home screen)
 *
 *   node scripts/generate-icons.mjs
 */
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const RED_TOP = "#f0261c";
const RED_BOTTOM = "#b00400";
const BAR_TOP = "#2b2d31";
const BAR_BOTTOM = "#0b0c0d";
// lucide "flame", 24×24, stroked
const FLAME = "M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4";

/** Slanted red tile with the flame, centred in a size×size box. */
function tile(size, { width, height, stroke = 2.3 }) {
  const x = (size - width) / 2;
  const y = (size - height) / 2;
  const slant = height * 0.22;
  const flame = height * 0.62;
  const scale = flame / 24;
  return `
    <path d="M${x + slant} ${y} H${x + width} L${x + width - slant} ${y + height} H${x} Z" fill="url(#red)"/>
    <path d="M${x + slant} ${y} H${x + width} L${x + width - slant * 0.55} ${y + height * 0.45} H${x + slant * 0.45} Z" fill="#fff" opacity="0.12"/>
    <g transform="translate(${size / 2 - flame / 2} ${size / 2 - flame / 2}) scale(${scale})" fill="none" stroke="#fff" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">
      <path d="${FLAME}"/>
    </g>`;
}

const defs = `
  <defs>
    <linearGradient id="red" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${RED_TOP}"/><stop offset="1" stop-color="${RED_BOTTOM}"/></linearGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${BAR_TOP}"/><stop offset="1" stop-color="${BAR_BOTTOM}"/></linearGradient>
  </defs>`;

/** Favicon: just the tile, transparent around it (like the header logo). */
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${defs}${tile(64, { width: 62, height: 50, stroke: 2.9 })}</svg>`;

/** Home-screen icon: dark broadcast square; the tile stays inside the maskable safe zone (centre 80%). */
const appIcon = (size) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${defs}
    <rect width="${size}" height="${size}" fill="url(#bar)"/>
    <rect y="${size * 0.86}" width="${size}" height="${size * 0.03}" fill="${RED_BOTTOM}"/>
    ${tile(size, { width: size * 0.62, height: size * 0.46 })}
  </svg>`;

const png = (svg, path) => sharp(Buffer.from(svg)).png().toFile(path);

await writeFile("src/app/icon.svg", favicon + "\n");
await png(appIcon(180), "src/app/apple-icon.png");
await png(appIcon(192), "public/icons/icon-192.png");
await png(appIcon(512), "public/icons/icon-512.png");
console.log("✓ icons written");
