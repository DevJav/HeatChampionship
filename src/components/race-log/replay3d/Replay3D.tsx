"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Clapperboard, Download, ListVideo, Maximize, Minimize, Pause, Play, Share2 } from "lucide-react";
import { Button, buttonVariants, Card, CardBody, Modal, Select, Spinner } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { LoggedRound } from "@/lib/race-log/rounds";
import { trackDrawing } from "@/lib/race-log/tracks";
import { slugify } from "@/lib/slug";
import { videoMimeType } from "../replay-video";
import { cameraPose, prepareReplay, replayDuration, type CameraMode } from "./director";
import { drawHud, readHudStyle, type HudStyle } from "./hud";
import { ShotScript, useShotScript } from "./ShotScript";
import type { World } from "./world";
import { t } from "@/i18n";

export type Replay3DCar = { id: string; name: string; color: string };

type Replay3DProps = {
  raceId: string;
  track: string;
  laps: number;
  cars: Replay3DCar[];
  rounds: LoggedRound[];
  title: string;
  /** Team radio line per driver id, shown as they cross the line */
  radio: Record<string, string>;
  /** Draw the imaginary lanes and racing line (?debug in the URL) */
  debug?: boolean;
};

type Recording = { step: "idle" } | { step: "recording"; progress: number } | { step: "ready"; file: File; url: string } | { step: "failed" };

const MODES: CameraMode[] = ["tv", "chase", "onboard", "heli"];
const SPEEDS = [1, 2, 0.5];

/** The logged race as a 3D broadcast: TV cameras or follow one car, plus a video to share. */
export function Replay3D({ raceId, track, laps, cars, rounds, title, radio, debug = false }: Replay3DProps) {
  const drawing = useMemo(() => trackDrawing(track, laps)!, [track, laps]);
  const replay = useMemo(() => prepareReplay(drawing.layout, drawing.geometry, rounds, cars, radio), [drawing, rounds, cars, radio]);
  const script = useShotScript(replay, raceId);
  const shots = script.shots;

  const frame = useRef<HTMLDivElement>(null);
  const view = useRef<HTMLDivElement>(null);
  const glCanvas = useRef<HTMLCanvasElement>(null);
  const hudCanvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<World | null>(null);
  const clock = useRef(replay.start);
  const dirty = useRef(true);

  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [time, setTime] = useState(replay.start);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [mode, setMode] = useState<CameraMode>("tv");
  const [follow, setFollow] = useState(replay.stage.motion.official[0]);
  const [fullscreen, setFullscreen] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [recording, setRecording] = useState<Recording>({ step: "idle" });
  const abort = useRef<AbortController | null>(null);
  const canRecord = useSyncExternalStore(
    () => () => {},
    () => videoMimeType() != null,
    () => false,
  );

  // three.js only loads here, after the page is up
  useEffect(() => {
    let cancelled = false;
    let created: World | null = null;
    import("./world")
      .then(async ({ createWorld, detectQuality }) => {
        if (cancelled || !glCanvas.current) return;
        const next = await createWorld(glCanvas.current, replay.stage, drawing.geometry, cars, { debug, quality: detectQuality() });
        if (cancelled) return next.dispose();
        created = next;
        world.current = next;
        dirty.current = true;
        setStatus("ready");
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setStatus("failed");
      });
    return () => {
      cancelled = true;
      created?.dispose();
      world.current = null;
    };
  }, [replay, drawing, cars, debug]);

  // Keep the canvases the size of the view
  const size = useRef({ width: 0, height: 0 });
  useEffect(() => {
    const el = view.current;
    if (!el || status !== "ready") return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      size.current = { width, height };
      world.current?.setSize(width, height, ratio);
      const hud = hudCanvas.current!;
      hud.width = Math.round(width * ratio);
      hud.height = Math.round(height * ratio);
      dirty.current = true;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [status]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === frame.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Render loop: advances the clock while playing, redraws only when something changed
  const style = useRef<HudStyle | null>(null);
  const recordingNow = recording.step === "recording";
  useEffect(() => {
    if (status !== "ready" || recordingNow) return;
    dirty.current = true;
    let raf = 0;
    let last = performance.now();
    let shown = clock.current;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (playing) {
        clock.current = Math.min(replay.end, clock.current + (dt * speed) / replay.secondsPerRound);
        dirty.current = true;
        if (clock.current >= replay.end) setPlaying(false);
      }
      if (dirty.current && world.current && size.current.width > 0) {
        dirty.current = false;
        const camera = cameraPose(replay.stage, shots, mode, follow, clock.current);
        world.current.render(clock.current, camera);
        const hud = hudCanvas.current!;
        const ctx = hud.getContext("2d")!;
        style.current ??= readHudStyle();
        const ratio = hud.width / size.current.width;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        drawHud(ctx, size.current.width, size.current.height, replay.stage, clock.current, style.current, {
          title,
          camera,
          captions: replay.captions,
          compact: size.current.width < 640,
        });
      }
      // The slider doesn't need every frame
      if (Math.abs(clock.current - shown) > 0.04 || (!playing && clock.current !== shown)) {
        shown = clock.current;
        setTime(shown);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [status, playing, speed, mode, follow, replay, shots, title, recordingNow]);

  function seek(value: number) {
    clock.current = value;
    dirty.current = true;
    setTime(value);
  }

  function togglePlay() {
    if (!playing && clock.current >= replay.end) seek(replay.start);
    setPlaying(!playing);
  }

  async function startRecording() {
    setPlaying(false);
    const controller = new AbortController();
    abort.current = controller;
    setRecording({ step: "recording", progress: 0 });
    try {
      const { recordReplay3d } = await import("./record");
      const blob = await recordReplay3d(
        { ...replay, shots },
        drawing.geometry,
        cars,
        title,
        (progress) => setRecording({ step: "recording", progress }),
        controller.signal,
      );
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `${slugify(title)}-3d.${ext}`, { type: blob.type });
      setRecording({ step: "ready", file, url: URL.createObjectURL(file) });
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error(error);
        setRecording({ step: "failed" });
      }
    }
  }

  function closeRecording() {
    abort.current?.abort();
    if (recording.step === "ready") URL.revokeObjectURL(recording.url);
    setRecording({ step: "idle" });
  }

  async function share(file: File) {
    try {
      await navigator.share({ files: [file], title });
    } catch {
      // Cancelled from the share sheet: nothing to do
    }
  }

  const r = t.raceLog.replay3d;
  const roundShown = time < 0 ? t.raceLog.grid : t.raceLog.round(Math.min(replay.stage.motion.lastRound, Math.floor(time) + 1));
  const canShare = recording.step === "ready" && navigator.canShare?.({ files: [recording.file] });
  const seconds = Math.round(replayDuration(replay) / 1000);
  const byOrder = replay.stage.motion.official.map((id) => cars.find((c) => c.id === id)!);

  return (
    <Card className="overflow-hidden">
      <div ref={frame} className={cn("flex flex-col", fullscreen && "h-full bg-black")}>
        <div
          ref={view}
          className={cn("relative w-full bg-[#9cc7ea]", fullscreen ? "min-h-0 flex-1" : "aspect-[4/3] sm:aspect-video")}
          onClick={() => status === "ready" && togglePlay()}
        >
          <canvas ref={glCanvas} className="absolute inset-0 size-full" />
          <canvas ref={hudCanvas} className="pointer-events-none absolute inset-0 size-full" />
          {status !== "ready" && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-bar/80 text-bar-fg">
              {status === "loading" ? (
                <>
                  <Spinner /> {r.loading}
                </>
              ) : (
                r.unsupported
              )}
            </div>
          )}
          {status === "ready" && !playing && (
            <span className="pointer-events-none absolute left-1/2 top-1/2 flex size-16 -translate-1/2 items-center justify-center rounded-full bg-bar/70 text-bar-fg">
              <Play className="size-8" />
            </span>
          )}
        </div>

        <CardBody className={cn("flex flex-col gap-3 py-3", fullscreen && "bg-surface")}>
          <div className="flex items-center gap-3">
            <Button size="icon" variant="primary" aria-label={playing ? t.raceLog.pause : t.raceLog.play} onClick={togglePlay} disabled={status !== "ready"}>
              {playing ? <Pause /> : <Play />}
            </Button>
            <input
              type="range"
              min={replay.start}
              max={replay.end}
              step={0.01}
              value={time}
              onChange={(e) => seek(Number(e.target.value))}
              className="grow accent-primary"
              aria-label={r.timeline}
            />
            <span className="w-20 text-right text-sm tabular-nums text-fg-muted">{roundShown}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1" role="group" aria-label={r.camera}>
              {MODES.map((m) => (
                <Button key={m} size="sm" variant={m === mode ? "primary" : "secondary"} aria-pressed={m === mode} onClick={() => setMode(m)}>
                  {r.cameras[m]}
                </Button>
              ))}
            </div>
            {mode !== "tv" && (
              <Select value={follow} onChange={(e) => setFollow(e.target.value)} aria-label={r.follow} className="h-8 w-auto text-sm">
                {byOrder.map((car) => (
                  <option key={car.id} value={car.id}>
                    {car.name}
                  </option>
                ))}
              </Select>
            )}
            <div className="ml-auto flex gap-1">
              <Button
                size="sm"
                variant={showScript ? "secondary" : "ghost"}
                title={r.script.button}
                aria-pressed={showScript}
                onClick={() => setShowScript(!showScript)}
              >
                <ListVideo /> {r.script.short}
              </Button>
              <Button size="sm" variant="ghost" title={r.speed} onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}>
                <span className="tabular-nums">{speed}×</span>
              </Button>
              {canRecord && (
                <Button size="sm" variant="ghost" title={r.videoButton} onClick={startRecording} disabled={status !== "ready"}>
                  <Clapperboard /> {t.raceLog.video.short}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                aria-label={fullscreen ? r.exitFullscreen : r.fullscreen}
                title={fullscreen ? r.exitFullscreen : r.fullscreen}
                onClick={() => (fullscreen ? document.exitFullscreen() : frame.current?.requestFullscreen())}
              >
                {fullscreen ? <Minimize /> : <Maximize />}
              </Button>
            </div>
          </div>
          {showScript && !fullscreen && (
            <ShotScript
              replay={replay}
              shots={shots}
              edited={script.edited}
              time={time}
              onSave={(next) => {
                // Edits are for the TV camera: show it
                setMode("tv");
                script.save(next);
              }}
              onReset={script.reset}
              onSeek={(at) => {
                setMode("tv");
                seek(at);
              }}
            />
          )}
        </CardBody>
      </div>

      <Modal
        open={recording.step !== "idle"}
        onClose={closeRecording}
        title={t.raceLog.video.title}
        description={recording.step === "recording" ? t.raceLog.video.recording(seconds) : undefined}
        footer={
          recording.step === "ready" && (
            <>
              <a href={recording.url} download={recording.file.name} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                <Download /> {t.raceLog.video.download}
              </a>
              {canShare && (
                <Button size="sm" variant="primary" onClick={() => share(recording.file)}>
                  <Share2 /> {t.raceLog.video.share}
                </Button>
              )}
            </>
          )
        }
      >
        {recording.step === "recording" && (
          <div className="h-2 w-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(recording.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-primary transition-[width]" style={{ width: `${recording.progress * 100}%` }} />
          </div>
        )}
        {recording.step === "ready" && <video src={recording.url} controls playsInline className="w-full bg-black" />}
        {recording.step === "failed" && <p className="text-sm text-danger">{t.raceLog.video.failed}</p>}
      </Modal>
    </Card>
  );
}
