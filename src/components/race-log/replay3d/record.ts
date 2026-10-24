import { AudioBufferSource, BufferTarget, CanvasSource, getFirstEncodableAudioCodec, getFirstEncodableVideoCodec, Mp4OutputFormat, Output, WebMOutputFormat } from "mediabunny";
import type { TrackGeometry } from "@/lib/race-log/layout";
import { createRaceAudio, renderRaceAudio, type RaceAudio } from "./audio";
import { cameraPose, replayDuration, type Replay } from "./director";
import { drawHud, readHudStyle } from "./hud";
import { createWorld, type TimeOfDay, type WorldCar } from "./world";

/**
 * The TV cut of the replay as a video file, graphics and sound included.
 * Nothing leaves the device.
 *
 * Where the browser can encode video itself (WebCodecs), every frame is drawn
 * at its exact moment and encoded at full quality: 1080p at 60 fps in an MP4,
 * smooth however long each frame takes. Elsewhere the replay is played in
 * real time and filmed off the canvas, which is softer and can drop frames.
 */

const FPS = 60;
const SIZE = { width: 1920, height: 1080 };
/** Bits per second per codec at 1080p60: plenty for sharp outlines and confetti */
const BITRATE = { avc: 12_000_000, vp9: 8_000_000 } as const;

type RecordOptions = {
  replay: Replay;
  geometry: TrackGeometry;
  cars: WorldCar[];
  title: string;
  timeOfDay: TimeOfDay;
  /** 0 … 1 */
  onProgress: (share: number) => void;
  signal?: AbortSignal;
};

export async function recordReplay3d(options: RecordOptions): Promise<Blob> {
  const codec = typeof VideoEncoder === "undefined" ? null : await getFirstEncodableVideoCodec(["avc", "vp9"], { ...SIZE, frameRate: FPS });
  return codec === "avc" || codec === "vp9" ? renderVideo(options, codec) : filmVideo(options);
}

/** The canvas the frames are put together on: the 3D view with the graphics on top */
async function studio({ replay, geometry, cars, title, timeOfDay }: RecordOptions, size: { width: number; height: number }, preserve: boolean) {
  const glCanvas = document.createElement("canvas");
  const world = await createWorld(glCanvas, replay.stage, geometry, cars, { preserve, timeOfDay, quality: "high" });
  world.setSize(size.width, size.height, 1);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d")!;
  const hud = document.createElement("canvas");
  hud.width = size.width;
  hud.height = size.height;
  const hudCtx = hud.getContext("2d")!;
  const style = readHudStyle();

  /** What's on screen `second` seconds into the video: the race time, the moment shown (a replay shows an earlier one) and the camera */
  const at = (second: number) => {
    const t = replay.start + second / replay.secondsPerRound;
    const camera = cameraPose(replay.stage, replay.shots, "tv", "", t);
    return { t, time: camera.time ?? t, camera };
  };
  const draw = (second: number) => {
    const { t, time, camera } = at(second);
    world.render(time, camera);
    drawHud(hudCtx, size.width, size.height, replay.stage, t, style, { title, camera, captions: replay.captions });
    ctx.drawImage(glCanvas, 0, 0);
    ctx.drawImage(hud, 0, 0);
    return { time, camera };
  };
  return { canvas, at, draw, dispose: () => world.dispose() };
}

const aborted = () => new DOMException("Aborted", "AbortError");

/** Frame by frame, at full quality, into an MP4 (or WebM where only VP9 can be encoded) */
async function renderVideo(options: RecordOptions, codec: "avc" | "vp9"): Promise<Blob> {
  const { replay, onProgress, signal } = options;
  const duration = replayDuration(replay) / 1000;
  const frames = Math.ceil(duration * FPS);
  const scene = await studio(options, SIZE, false);
  const format = codec === "avc" ? new Mp4OutputFormat({ fastStart: "in-memory" }) : new WebMOutputFormat();
  const target = new BufferTarget();
  const output = new Output({ format, target });
  try {
    const video = new CanvasSource(scene.canvas, { codec, bitrate: BITRATE[codec], latencyMode: "quality" });
    output.addVideoTrack(video, { frameRate: FPS });
    const audioCodec = await getFirstEncodableAudioCodec(
      format.getSupportedAudioCodecs().filter((c) => c === "aac" || c === "opus"),
      { numberOfChannels: 2, sampleRate: 48000 },
    );
    const sound = audioCodec ? new AudioBufferSource({ codec: audioCodec, bitrate: 192_000 }) : null;
    if (sound) output.addAudioTrack(sound);
    await output.start();

    // The sound first: it renders much faster than real time
    if (sound) await sound.add(await renderRaceAudio(replay, duration, scene.at));
    onProgress(0.05);

    for (let frame = 0; frame < frames; frame++) {
      if (signal?.aborted) throw aborted();
      scene.draw(frame / FPS);
      await video.add(frame / FPS, 1 / FPS);
      onProgress(0.05 + (0.95 * (frame + 1)) / frames);
      // Let the page update the progress bar now and then
      if (frame % 6 === 5) await new Promise((resolve) => setTimeout(resolve, 0));
    }
    await output.finalize();
    return new Blob([target.buffer!], { type: format.mimeType });
  } catch (error) {
    if (output.state !== "finalized") await output.cancel();
    throw error;
  } finally {
    scene.dispose();
  }
}

/** Formats with sound first; video only as a last resort */
function mimeType() {
  if (typeof MediaRecorder === "undefined") return null;
  const types = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/mp4", "video/webm"];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

/** Plays the replay in real time and films it off the canvas; the tab must stay visible */
async function filmVideo(options: RecordOptions): Promise<Blob> {
  const { replay, onProgress, signal } = options;
  const type = mimeType();
  if (!type) throw new Error("MediaRecorder unavailable");
  const scene = await studio(options, { width: 1280, height: 720 }, true);
  const duration = replayDuration(replay);
  let audio: RaceAudio | null = null;
  try {
    audio = createRaceAudio(replay, { record: true });
    await audio.resume();
  } catch (error) {
    // No Web Audio: a silent video
    console.error(error);
  }
  const frame = (ms: number) => {
    const { time, camera } = scene.draw(ms / 1000);
    audio?.update(time, camera);
  };
  frame(0);

  const stream = new MediaStream([...scene.canvas.captureStream(30).getVideoTracks(), ...(audio?.stream?.getAudioTracks() ?? [])]);
  const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  return new Promise((resolve, reject) => {
    let raf = 0;
    const stop = () => {
      cancelAnimationFrame(raf);
      if (recorder.state !== "inactive") recorder.stop();
      stream.getTracks().forEach((track) => track.stop());
      scene.dispose();
      audio?.dispose();
    };
    signal?.addEventListener("abort", () => {
      stop();
      reject(aborted());
    });
    recorder.onstop = () => {
      if (!signal?.aborted) resolve(new Blob(chunks, { type: type.split(";")[0] }));
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
