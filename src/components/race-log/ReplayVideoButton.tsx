"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { Clapperboard, Download, Share2 } from "lucide-react";
import { Button, buttonVariants, Modal } from "@/components/ui";
import type { LoggedRound } from "@/lib/race-log/rounds";
import { trackDrawing } from "@/lib/race-log/tracks";
import { slugify } from "@/lib/slug";
import { recordReplay, videoDuration, videoMimeType, type VideoCar } from "./replay-video";
import { t } from "@/i18n";

type State =
  | { step: "idle" }
  | { step: "recording"; progress: number }
  | { step: "ready"; file: File; url: string }
  | { step: "failed" };

type ReplayVideoButtonProps = { track: string; laps: number; cars: VideoCar[]; rounds: LoggedRound[]; title: string };

/** Records the replay as a video and offers it to share (WhatsApp on phones) or download. */
export function ReplayVideoButton({ track, laps, cars, rounds, title }: ReplayVideoButtonProps) {
  const [state, setState] = useState<State>({ step: "idle" });
  // MediaRecorder support is only known in the browser
  const supported = useSyncExternalStore(
    () => () => {},
    () => videoMimeType() != null,
    () => false,
  );
  const abort = useRef<AbortController | null>(null);
  const drawing = trackDrawing(track, laps);

  if (!drawing || !supported) return null;

  async function start() {
    const controller = new AbortController();
    abort.current = controller;
    setState({ step: "recording", progress: 0 });
    try {
      const blob = await recordReplay(
        { ...drawing!, cars, rounds, title },
        (progress) => setState({ step: "recording", progress }),
        controller.signal,
      );
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `${slugify(title)}.${ext}`, { type: blob.type });
      setState({ step: "ready", file, url: URL.createObjectURL(file) });
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error(error);
        setState({ step: "failed" });
      }
    }
  }

  function close() {
    abort.current?.abort();
    if (state.step === "ready") URL.revokeObjectURL(state.url);
    setState({ step: "idle" });
  }

  async function share(file: File) {
    try {
      await navigator.share({ files: [file], title });
    } catch {
      // Cancelled from the share sheet: nothing to do
    }
  }

  const canShare = state.step === "ready" && navigator.canShare?.({ files: [state.file] });
  const seconds = Math.round(videoDuration(rounds.length) / 1000);

  return (
    <>
      <Button variant="ghost" size="sm" onClick={start} title={t.raceLog.video.button}>
        <Clapperboard /> {t.raceLog.video.short}
      </Button>
      <Modal
        open={state.step !== "idle"}
        onClose={close}
        title={t.raceLog.video.title}
        description={state.step === "recording" ? t.raceLog.video.recording(seconds) : undefined}
        footer={
          state.step === "ready" && (
            <>
              <a href={state.url} download={state.file.name} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                <Download /> {t.raceLog.video.download}
              </a>
              {canShare && (
                <Button size="sm" variant="primary" onClick={() => share(state.file)}>
                  <Share2 /> {t.raceLog.video.share}
                </Button>
              )}
            </>
          )
        }
      >
        {state.step === "recording" && (
          <div className="h-2 w-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(state.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-primary transition-[width]" style={{ width: `${state.progress * 100}%` }} />
          </div>
        )}
        {state.step === "ready" && <video src={state.url} controls playsInline className="w-full bg-black" />}
        {state.step === "failed" && <p className="text-sm text-danger">{t.raceLog.video.failed}</p>}
      </Modal>
    </>
  );
}
