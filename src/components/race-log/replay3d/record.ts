import type { TrackGeometry } from "@/lib/race-log/layout";
import { videoMimeType } from "../replay-video";
import { cameraPose, replayDuration, type Replay } from "./director";
import { drawHud, readHudStyle } from "./hud";
import { createWorld, type WorldCar } from "./world";

const W = 1280;
const H = 720;

/**
 * Plays the TV cut of the replay on offscreen canvases in real time and
 * records it, graphics included. Like the 2D video, nothing leaves the
 * device and the tab must stay visible.
 */
export async function recordReplay3d(
  replay: Replay,
  geometry: TrackGeometry,
  cars: WorldCar[],
  title: string,
  onProgress: (share: number) => void,
  signal?: AbortSignal,
): Promise<Blob> {
  const mimeType = videoMimeType();
  if (!mimeType) throw new Error("MediaRecorder unavailable");

  const glCanvas = document.createElement("canvas");
  const world = await createWorld(glCanvas, replay.stage, geometry, cars, { preserve: true });
  world.setSize(W, H, 1);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const hud = document.createElement("canvas");
  hud.width = W;
  hud.height = H;
  const hudCtx = hud.getContext("2d")!;
  const style = readHudStyle();
  const duration = replayDuration(replay);

  const frame = (ms: number) => {
    const t = replay.start + ms / 1000 / replay.secondsPerRound;
    const camera = cameraPose(replay.stage, replay.shots, "tv", "", t);
    world.render(t, camera);
    drawHud(hudCtx, W, H, replay.stage, t, style, { title, camera, captions: replay.captions });
    ctx.drawImage(glCanvas, 0, 0);
    ctx.drawImage(hud, 0, 0);
  };
  frame(0);

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  return new Promise((resolve, reject) => {
    let raf = 0;
    const stop = () => {
      cancelAnimationFrame(raf);
      if (recorder.state !== "inactive") recorder.stop();
      stream.getTracks().forEach((track) => track.stop());
      world.dispose();
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
      frame(Math.min(ms, duration));
      onProgress(Math.min(1, ms / duration));
      if (ms >= duration) stop();
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  });
}
