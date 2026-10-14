/**
 * Generates the app icons from the logo (red slanted tile + rev gauge):
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
const AMBER = "#f2a900";
// Rev gauge with an amber redline, 24×24, stroked — same paths as GaugeIcon in src/components/layout/Logo.tsx
const GAUGE = `<path d="M3.34 19A10 10 0 1 1 21.27 10.25"/>
      <path d="M21.27 10.25A10 10 0 0 1 20.66 19" stroke="${AMBER}" stroke-width="3.6" stroke-linecap="butt"/>
      <path d="M5.82 12.34 4.47 11.98M8.8 8.46 8.1 7.25M13.66 7.82 14.02 6.47" stroke-width="1.5"/>
      <path d="M12 14 18.4 12.4"/>
      <circle cx="12" cy="14" r="1.8" fill="#fff" stroke="none"/>`;

/** Slanted red tile with the gauge, centred in a size×size box. */
function tile(size, { width, height, stroke = 2.3 }) {
  const x = (size - width) / 2;
  const y = (size - height) / 2;
  const slant = height * 0.22;
  const icon = height * 0.62;
  const scale = icon / 24;
  return `
    <path d="M${x + slant} ${y} H${x + width} L${x + width - slant} ${y + height} H${x} Z" fill="url(#red)"/>
    <path d="M${x + slant} ${y} H${x + width} L${x + width - slant * 0.55} ${y + height * 0.45} H${x + slant * 0.45} Z" fill="#fff" opacity="0.12"/>
    <g transform="translate(${size / 2 - icon / 2} ${size / 2 - icon / 2}) scale(${scale})" fill="none" stroke="#fff" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">
      ${GAUGE}
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
