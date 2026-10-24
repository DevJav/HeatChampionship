import { finishLine } from "@/lib/race-log/layout";
import { captionAt, type CameraPose, type Caption, type Stage } from "./director";
import { intlLocale, t as text } from "@/i18n";

/**
 * Broadcast graphics over the 3D view, drawn on a 2D canvas so they end up
 * in the recorded video too: timing tower, title, captions and the camera.
 */

/** Race seconds per round, to turn gaps into something that reads like timing */
const RACE_SECONDS_PER_ROUND = 11;
const gapFormat = new Intl.NumberFormat(intlLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export type HudStyle = { primary: string; accent: string; bar: string; barFg: string; font: string };

export function readHudStyle(): HudStyle {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    primary: v("--primary", "#d10500"),
    accent: v("--accent", "#f2a900"),
    bar: v("--bar", "#08090a"),
    barFg: v("--bar-fg", "#ffffff"),
    font: getComputedStyle(document.body).fontFamily,
  };
}

function fitText(ctx: CanvasRenderingContext2D, value: string, width: number) {
  if (ctx.measureText(value).width <= width) return value;
  let cut = value;
  while (cut.length > 1 && ctx.measureText(cut + "…").width > width) cut = cut.slice(0, -1);
  return cut + "…";
}

type HudOptions = {
  title: string;
  camera: CameraPose;
  captions: Caption[];
  /** Small screens: no title block, so it doesn't run into the timing tower */
  compact?: boolean;
};

export function drawHud(ctx: CanvasRenderingContext2D, width: number, height: number, stage: Stage, t: number, style: HudStyle, options: HudOptions) {
  const { motion, layout, names, colors } = stage;
  // Graphics shrink with the view, but not past readable on a phone
  const s = Math.max(0.55, Math.min(width / 1280, height / 720) * 1.15);
  const font = (weight: number, size: number, italic = false) => `${italic ? "italic " : ""}${weight} ${size * s}px ${style.font}`;
  const r = text.raceLog.replay3d;
  ctx.clearRect(0, 0, width, height);
  ctx.textBaseline = "middle";
  const replay = options.camera.replay;
  if (replay) return drawReplay(ctx, width, height, t, replay, s, font, style, options.camera.label);

  const order = motion.order(Math.max(0, t));
  const leader = motion.at(order[0], Math.max(0, t));
  const finished = (id: string) => motion.finishedAt[id] !== null && motion.finishedAt[id]! <= t;
  const lap = Math.min(layout.laps, Math.floor(Math.max(0, leader.pos) / layout.spacesPerLap) + 1);
  const raceOver = order.every(finished);

  // Timing tower, top left (not on the podium, where the three on it say it all)
  if (!options.camera.clean) {
    const x = 18 * s;
    let y = 18 * s;
    const w = 270 * s;
    const row = 27 * s;
    // Header: lap or chequered flag
    ctx.fillStyle = style.bar;
    ctx.globalAlpha = 0.92;
    ctx.fillRect(x, y, w, 34 * s);
    ctx.globalAlpha = 1;
    ctx.fillStyle = style.primary;
    ctx.fillRect(x, y, 5 * s, 34 * s);
    ctx.fillStyle = style.barFg;
    ctx.font = font(800, 17, true);
    ctx.textAlign = "left";
    const header = t < 0 ? text.raceLog.grid : leader.pos >= finishLine(layout) ? text.raceLog.finish : text.raceLog.lap(lap, layout.laps);
    ctx.fillText(header.toUpperCase(), x + 14 * s, y + 17 * s);
    if (t >= 0 && t <= motion.lastRound) {
      ctx.textAlign = "right";
      ctx.font = font(600, 13);
      ctx.globalAlpha = 0.75;
      ctx.fillText(text.raceLog.round(Math.min(motion.lastRound, Math.floor(t) + 1)), x + w - 10 * s, y + 17 * s);
      ctx.globalAlpha = 1;
    }
    y += 38 * s;

    order.forEach((id, i) => {
      const top = y + i * row;
      ctx.fillStyle = style.bar;
      ctx.globalAlpha = 0.82;
      ctx.fillRect(x, top, w, row - 2 * s);
      ctx.globalAlpha = 1;
      ctx.fillStyle = raceOver && i < 3 ? style.accent : style.barFg;
      ctx.font = font(800, 15);
      ctx.textAlign = "center";
      ctx.fillText(String(i + 1), x + 16 * s, top + row / 2 - s);
      ctx.fillStyle = colors[id];
      ctx.fillRect(x + 32 * s, top + 5 * s, 5 * s, row - 12 * s);
      ctx.strokeStyle = "rgb(255 255 255 / 0.45)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 32 * s, top + 5 * s, 5 * s, row - 12 * s);
      ctx.fillStyle = style.barFg;
      ctx.textAlign = "left";
      ctx.font = font(600, 15);
      ctx.fillText(fitText(ctx, names[id], 150 * s), x + 45 * s, top + row / 2 - s);

      // Gap to the leader, a spin or the flag
      ctx.textAlign = "right";
      ctx.font = font(600, 13);
      const spinning = motion.at(id, Math.max(0, t)).spin > 0 && motion.at(id, Math.max(0, t)).spin < Math.PI * 2;
      const slipstreaming = motion.events.some((e) => e.kind === "slipstream" && e.id === id && t >= e.t && t < e.end);
      const gap = t > 0.15 ? motion.gap(id, t) : null;
      let right = i === 0 && t > 0 ? r.leader : gap !== null ? `+${gapFormat.format(gap * RACE_SECONDS_PER_ROUND)}` : "";
      ctx.fillStyle = style.barFg;
      if (spinning) {
        right = r.spin.toUpperCase();
        ctx.fillStyle = "#ff5a4f";
      } else if (slipstreaming) {
        right = r.slipstream.toUpperCase();
        ctx.fillStyle = "#7cc8ff";
      }
      ctx.globalAlpha = spinning || slipstreaming ? 1 : 0.8;
      ctx.fillText(right, x + w - (finished(id) ? 30 : 10) * s, top + row / 2 - s);
      ctx.globalAlpha = 1;
      if (finished(id)) {
        // Tiny chequered flag
        const fx = x + w - 24 * s;
        const fy = top + 7 * s;
        const cell = 3 * s;
        for (let cx = 0; cx < 4; cx++) {
          for (let cy = 0; cy < 4; cy++) {
            ctx.fillStyle = (cx + cy) % 2 ? "#111" : "#fff";
            ctx.fillRect(fx + cx * cell, fy + cy * cell, cell, cell);
          }
        }
      }
    });
  }

  // Title, top right
  const tx = width - 18 * s;
  ctx.textAlign = "right";
  if (!options.compact) {
  ctx.font = font(800, 18, true);
  const title = options.title.toUpperCase();
  const tw = ctx.measureText(title).width;
  ctx.fillStyle = style.bar;
  ctx.globalAlpha = 0.88;
  ctx.fillRect(tx - tw - 26 * s, 18 * s, tw + 26 * s, 34 * s);
  ctx.globalAlpha = 1;
  ctx.fillStyle = style.primary;
  ctx.fillRect(tx - tw - 26 * s, 48 * s, tw + 26 * s, 4 * s);
  ctx.fillStyle = style.barFg;
  ctx.fillText(title, tx - 13 * s, 35 * s);
  ctx.font = font(700, 12);
  ctx.fillStyle = style.barFg;
  ctx.globalAlpha = 0.85;
  ctx.shadowColor = "rgb(0 0 0 / 0.6)";
  ctx.shadowBlur = 4 * s;
  ctx.fillText(r.title.toUpperCase(), tx, 66 * s);
  }
  // Camera, bottom right
  ctx.font = font(700, 13, true);
  ctx.fillText(options.camera.label.toUpperCase(), tx, height - 22 * s);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  // Lower third
  const caption = captionAt(options.captions, t);
  if (caption) {
    const k = Math.min(1, (t - caption.start) / 0.08, (caption.end - t) / 0.08);
    ctx.globalAlpha = Math.max(0, k);
    ctx.font = font(caption.radio ? 600 : 800, caption.radio ? 18 : 24, !caption.radio);
    const label = caption.radio ? r.radio.toUpperCase() : null;
    const maxW = width - 120 * s;
    const value = fitText(ctx, caption.radio ? caption.text : caption.text.toUpperCase(), maxW - 60 * s);
    const cw = Math.min(maxW, ctx.measureText(value).width + 50 * s);
    const cy = height - 92 * s;
    const cx = 18 * s;
    if (label) {
      ctx.font = font(800, 12);
      const lw = ctx.measureText(label).width + 20 * s;
      ctx.fillStyle = style.primary;
      ctx.fillRect(cx, cy - 22 * s, lw, 20 * s);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "left";
      ctx.fillText(label, cx + 10 * s, cy - 12 * s);
    }
    ctx.fillStyle = style.bar;
    ctx.globalAlpha *= 0.92;
    ctx.fillRect(cx, cy, cw, 46 * s);
    ctx.globalAlpha = Math.max(0, k);
    ctx.fillStyle = caption.color ?? style.primary;
    ctx.fillRect(cx, cy, 7 * s, 46 * s);
    ctx.fillStyle = style.barFg;
    ctx.textAlign = "left";
    ctx.font = font(caption.radio ? 600 : 800, caption.radio ? 18 : 24, !caption.radio);
    ctx.fillText(value, cx + 24 * s, cy + 23 * s);
    ctx.globalAlpha = 1;
  }
}

/**
 * An instant replay: no timing tower or captions, a "REPLAY" badge in the
 * corner and a red band sweeping across the picture going in and coming out.
 */
function drawReplay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  t: number,
  replay: { from: number; to: number },
  s: number,
  font: (weight: number, size: number, italic?: boolean) => string,
  style: HudStyle,
  label: string,
) {
  const r = text.raceLog.replay3d;
  ctx.font = font(800, 20, true);
  const badge = r.replay.toUpperCase();
  const bw = ctx.measureText(badge).width + 56 * s;
  ctx.fillStyle = style.bar;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(18 * s, 18 * s, bw, 38 * s);
  ctx.globalAlpha = 1;
  ctx.fillStyle = style.primary;
  ctx.fillRect(18 * s, 18 * s, 6 * s, 38 * s);
  // Rewind mark
  ctx.beginPath();
  for (const dx of [0, 9]) {
    ctx.moveTo(36 * s + dx * s, 37 * s);
    ctx.lineTo(45 * s + dx * s, 30 * s);
    ctx.lineTo(45 * s + dx * s, 44 * s);
    ctx.closePath();
  }
  ctx.fill();
  ctx.fillStyle = style.barFg;
  ctx.textAlign = "left";
  ctx.fillText(badge, 62 * s, 37 * s);
  ctx.textAlign = "right";
  ctx.font = font(700, 13, true);
  ctx.shadowColor = "rgb(0 0 0 / 0.6)";
  ctx.shadowBlur = 4 * s;
  ctx.fillText(label.toUpperCase(), width - 18 * s, height - 22 * s);
  ctx.shadowBlur = 0;

  // The wipe: a slanted band crossing the screen at the start and the end
  const WIPE = 0.07;
  const k = t - replay.from < WIPE ? (t - replay.from) / WIPE : replay.to - t < WIPE ? 1 - (replay.to - t) / WIPE : null;
  if (k === null) return;
  const band = width * 0.35;
  const x = -band + k * (width + band * 2);
  ctx.save();
  ctx.fillStyle = style.primary;
  ctx.beginPath();
  ctx.moveTo(x - band / 2, height);
  ctx.lineTo(x + band / 4, 0);
  ctx.lineTo(x + band, 0);
  ctx.lineTo(x + band / 4, height);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = style.barFg;
  ctx.font = font(900, 46, true);
  ctx.textAlign = "center";
  ctx.fillText(badge, x + band / 3, height / 2);
  ctx.restore();
}
