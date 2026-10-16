import { rankHistory } from "@/lib/race-log/insights";
import { carPoint, dividerEnds, racingLineSide, type TrackGeometry, type TrackLayout } from "@/lib/race-log/layout";
import type { LoggedRound } from "@/lib/race-log/rounds";
import { t } from "@/i18n";

/**
 * Renders a logged race as a short broadcast-style video in the browser:
 * the track on a canvas, a title bar and the running order, recorded with
 * MediaRecorder. Nothing leaves the device.
 */

export type VideoCar = { id: string; name: string; label: string; color: string };

export type ReplayScene = {
  layout: TrackLayout;
  geometry: TrackGeometry;
  cars: VideoCar[];
  rounds: LoggedRound[];
  title: string;
};

const W = 1280;
const H = 720;
const BAR = 64;
const PANEL = 280;
/** Cars are drawn larger than on the page so they read on a phone */
const CAR = { length: 24, width: 14 };

const GRID_MS = 1000;
const MOVE_MS = 700;
const HOLD_MS = 200;
const END_MS = 3000;
const FPS = 30;

/** Total length of the video for a log with this many rounds. */
export function videoDuration(rounds: number) {
  return GRID_MS + (rounds - 1) * (MOVE_MS + HOLD_MS) + END_MS;
}

/** Round and progress through its move (0 … 1) at a point in the video. */
function frameAt(ms: number, last: number) {
  if (ms < GRID_MS) return { round: 0, t: 1 };
  const step = Math.floor((ms - GRID_MS) / (MOVE_MS + HOLD_MS));
  if (step >= last) return { round: last, t: 1 };
  const into = ms - GRID_MS - step * (MOVE_MS + HOLD_MS);
  return { round: step + 1, t: Math.min(1, into / MOVE_MS) };
}

const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);

type Palette = Record<"ground" | "asphalt" | "edge" | "line" | "bar" | "barFg" | "primary" | "accent" | "surface" | "fg", string>;

function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    ground: v("--track-ground"),
    asphalt: v("--track-asphalt"),
    edge: v("--track-edge"),
    line: v("--track-line"),
    bar: v("--bar"),
    barFg: v("--bar-fg"),
    primary: v("--primary"),
    accent: v("--accent"),
    surface: v("--surface"),
    fg: v("--fg"),
  };
}

function drawTrack(ctx: CanvasRenderingContext2D, { layout, geometry }: ReplayScene, c: Palette, font: string) {
  const path = new Path2D(geometry.path);
  const { halfWidth } = geometry;
  ctx.lineJoin = "round";
  ctx.strokeStyle = c.edge;
  ctx.lineWidth = halfWidth * 2 + 3;
  ctx.stroke(path);
  ctx.strokeStyle = c.asphalt;
  ctx.lineWidth = halfWidth * 2 - 1;
  ctx.stroke(path);
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = c.line;
  ctx.lineWidth = 0.8;
  ctx.stroke(path);
  ctx.setLineDash([]);

  const n = layout.spacesPerLap;
  const corners = new Set(layout.corners.map((corner) => corner.before));
  const line = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  };
  for (let s = 0; s < n; s++) {
    const side = racingLineSide(layout, s) === "right" ? 1 : 0;
    ctx.strokeStyle = c.edge;
    ctx.lineWidth = 3;
    line(dividerEnds(geometry, s)[side], dividerEnds(geometry, (s + 1) % n)[side]);
    if (s === 0) continue;
    ctx.strokeStyle = corners.has(s) ? c.edge : c.line;
    ctx.lineWidth = corners.has(s) ? 3.5 : 1;
    line(...dividerEnds(geometry, s));
  }

  const [f1, f2] = dividerEnds(geometry, 0);
  ctx.lineWidth = 6;
  ctx.strokeStyle = c.barFg;
  line(f1, f2);
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = c.bar;
  line(f1, f2);
  ctx.setLineDash([]);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  layout.corners.forEach((corner, i) => {
    const [x, y] = geometry.badges[i];
    ctx.beginPath();
    ctx.arc(x, y, 17, 0, Math.PI * 2);
    ctx.fillStyle = c.surface;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = c.asphalt;
    ctx.stroke();
    ctx.fillStyle = c.fg;
    ctx.font = `700 20px ${font}`;
    ctx.fillText(String(corner.limit), x, y + 1);
  });
}

function drawCars(ctx: CanvasRenderingContext2D, scene: ReplayScene, round: number, t: number, c: Palette, font: string) {
  const { layout, geometry, rounds } = scene;
  const from = rounds[Math.max(0, round - 1)].positions;
  const to = rounds[round].positions;
  const k = ease(t);
  const placed = scene.cars.map((car) => {
    const a = from[car.id];
    const b = to[car.id];
    return { car, pos: a.pos + (b.pos - a.pos) * k, spot: a.spot + (b.spot - a.spot) * k };
  });
  // Back of the field first, so the leader is drawn on top
  for (const { car, pos, spot } of placed.sort((x, y) => x.pos - y.pos)) {
    const p = carPoint(layout, geometry, pos, spot);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((p.angle * Math.PI) / 180);
    ctx.beginPath();
    ctx.roundRect(-CAR.length / 2, -CAR.width / 2, CAR.length, CAR.width, 3.5);
    ctx.fillStyle = car.color;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = c.bar;
    ctx.stroke();
    ctx.rotate((-p.angle * Math.PI) / 180);
    ctx.font = `700 11px ${font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = c.bar;
    ctx.strokeText(car.label, 0, 1);
    ctx.fillStyle = c.barFg;
    ctx.fillText(car.label, 0, 1);
    ctx.restore();
  }
}

function drawOverlay(ctx: CanvasRenderingContext2D, scene: ReplayScene, round: number, order: string[], c: Palette, font: string) {
  const last = scene.rounds.length - 1;
  const done = round === last;

  // Title bar
  ctx.fillStyle = c.bar;
  ctx.fillRect(0, 0, W, BAR);
  ctx.fillStyle = c.primary;
  ctx.fillRect(0, BAR - 4, W, 4);
  ctx.fillRect(24, 14, 8, BAR - 32);
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = c.barFg;
  ctx.font = `italic 700 30px ${font}`;
  ctx.fillText(scene.title.toUpperCase(), 46, BAR / 2 - 1);
  ctx.textAlign = "right";
  ctx.font = `italic 700 24px ${font}`;
  const label = round === 0 ? t.raceLog.grid : done ? t.raceLog.finish : `${t.raceLog.round(round)} / ${last}`;
  ctx.fillText(label.toUpperCase(), W - 24, BAR / 2 - 1);

  // Running order
  const x = W - PANEL;
  ctx.fillStyle = c.bar;
  ctx.globalAlpha = 0.88;
  ctx.fillRect(x, BAR, PANEL, H - BAR);
  ctx.globalAlpha = 1;
  ctx.fillStyle = c.barFg;
  ctx.textAlign = "left";
  ctx.font = `italic 700 20px ${font}`;
  ctx.fillText((done ? t.raceLog.standings : t.raceLog.positions).toUpperCase(), x + 20, BAR + 32);
  const byId = new Map(scene.cars.map((car) => [car.id, car]));
  const row = Math.min(46, (H - BAR - 70) / order.length);
  order.forEach((id, i) => {
    const car = byId.get(id)!;
    const y = BAR + 70 + i * row;
    ctx.font = `700 18px ${font}`;
    ctx.textAlign = "right";
    ctx.fillStyle = i < 3 && done ? c.accent : c.barFg;
    ctx.fillText(String(i + 1), x + 44, y);
    ctx.fillStyle = car.color;
    ctx.fillRect(x + 56, y - 9, 6, 18);
    // Faint outline so dark car colours still show on the panel
    ctx.strokeStyle = "rgb(255 255 255 / 0.45)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 55.5, y - 9.5, 7, 19);
    ctx.textAlign = "left";
    ctx.fillStyle = c.barFg;
    ctx.font = `600 20px ${font}`;
    ctx.fillText(car.name, x + 74, y, PANEL - 90);
  });
}

type Style = { c: Palette; font: string };

/** Draws one frame of the video at `ms`. */
function drawReplayFrame(ctx: CanvasRenderingContext2D, scene: ReplayScene, ranks: Record<string, number>[], ms: number, { c, font }: Style) {
  const last = scene.rounds.length - 1;
  const { round, t } = frameAt(ms, last);

  ctx.fillStyle = c.ground;
  ctx.fillRect(0, 0, W, H);

  // Track fitted into the area left of the panel, below the bar
  const { geometry } = scene;
  const areaW = W - PANEL;
  const areaH = H - BAR;
  const scale = Math.min(areaW / geometry.width, areaH / geometry.height) * 0.98;
  ctx.save();
  ctx.translate((areaW - geometry.width * scale) / 2, BAR + (areaH - geometry.height * scale) / 2);
  ctx.scale(scale, scale);
  drawTrack(ctx, scene, c, font);
  drawCars(ctx, scene, round, t, c, font);
  ctx.restore();

  const shownRanks = ranks[t < 0.5 ? Math.max(0, round - 1) : round];
  const order = Object.keys(shownRanks).sort((a, b) => shownRanks[a] - shownRanks[b]);
  drawOverlay(ctx, scene, round, order, c, font);
}

/** Best container the browser can record: MP4 shares best (WhatsApp), WebM is the fallback. */
export function videoMimeType() {
  if (typeof MediaRecorder === "undefined") return null;
  return ["video/mp4;codecs=avc1.42E01E", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

/**
 * Plays the replay onto an offscreen canvas in real time and records it.
 * `onProgress` gets 0 … 1. The tab must stay visible: browsers pause
 * animation frames in background tabs.
 */
export function recordReplay(scene: ReplayScene, onProgress: (share: number) => void, signal?: AbortSignal): Promise<Blob> {
  const mimeType = videoMimeType();
  if (!mimeType) return Promise.reject(new Error("MediaRecorder unavailable"));

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const ranks = rankHistory(scene.layout, scene.rounds);
  const duration = videoDuration(scene.rounds.length);
  const style = { c: readPalette(), font: getComputedStyle(document.body).fontFamily };
  drawReplayFrame(ctx, scene, ranks, 0, style);

  const stream = canvas.captureStream(FPS);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  return new Promise((resolve, reject) => {
    let frame = 0;
    const stop = () => {
      cancelAnimationFrame(frame);
      if (recorder.state !== "inactive") recorder.stop();
      stream.getTracks().forEach((track) => track.stop());
    };
    signal?.addEventListener("abort", () => {
      stop();
      reject(new DOMException("Aborted", "AbortError"));
    });
    recorder.onstop = () => {
      if (!signal?.aborted) resolve(new Blob(chunks, { type: mimeType.split(";")[0] }));
    };
    recorder.onerror = () => {
      stop();
      reject(new Error("Recording failed"));
    };

    recorder.start(1000);
    const start = performance.now();
    const tick = (now: number) => {
      const ms = now - start;
      drawReplayFrame(ctx, scene, ranks, Math.min(ms, duration), style);
      onProgress(Math.min(1, ms / duration));
      if (ms >= duration) stop();
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  });
}
