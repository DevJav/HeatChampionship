"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, CloudOff, Flag, Loader2, RotateCcw, Shuffle } from "lucide-react";
import { deleteRaceLog, saveRaceLog } from "@/actions/race-logs";
import { Button, ButtonLink, Card, CardBody, CardDescription, CardFooter, CardHeader, CardTitle, Modal, Select, Skeleton } from "@/components/ui";
import { RaceRecorder, type RecorderLog } from "@/components/race-log/RaceRecorder";
import { useOnClient } from "@/components/race-log/viewport";
import { cn } from "@/lib/cn";
import { carLabels, newRaceLog, type LogCar, type RaceLogData } from "@/lib/race-log/log";
import { trackDrawing } from "@/lib/race-log/tracks";
import { t } from "@/i18n";

type Driver = { id: string; name: string; favoriteColorId: string | null };
type CarColor = { id: string; name: string; hex: string };

type RaceLogSessionProps = {
  raceId: string;
  track: string;
  laps?: number;
  /** Confirmed drivers, in sign-up order */
  drivers: Driver[];
  carColors: CarColor[];
  savedLog: RaceLogData | null;
};

type Sync = "saved" | "dirty" | "saving" | "failed";
type Meta = Pick<RaceLogData, "track" | "laps" | "cars">;

/** Copy kept on the phone; `dirty` means the server hasn't got it yet. */
type Stored = { log: RaceLogData; dirty: boolean };

const RETRY_MS = 10_000;
const SAVE_DELAY_MS = 600;

function readLocal(key: string): Stored | null {
  try {
    const stored = JSON.parse(localStorage.getItem(key) ?? "null");
    return stored?.log?.version === 1 ? stored : null;
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: Stored | null) {
  try {
    if (value) localStorage.setItem(key, JSON.stringify(value));
    else localStorage.removeItem(key);
  } catch {}
}

/** The session starts from this device's copy when it never reached the server, so it only renders on the client. */
export function RaceLogSession(props: RaceLogSessionProps) {
  return useOnClient() ? <Session {...props} /> : <Skeleton className="h-[70dvh] w-full" />;
}

function Session({ raceId, track, laps, drivers, carColors, savedLog }: RaceLogSessionProps) {
  const storageKey = `heat:race-log:${raceId}`;
  const [initial] = useState(() => {
    const local = readLocal(storageKey);
    return local?.dirty ? local : { log: savedLog, dirty: false };
  });
  const [meta, setMeta] = useState<Meta | null>(initial.log && { track: initial.log.track, laps: initial.log.laps, cars: initial.log.cars });
  const [log, setLog] = useState<RecorderLog | null>(initial.log && { rounds: initial.log.rounds, draft: initial.log.draft, history: [] });
  const [sync, setSync] = useState<Sync>(initial.dirty ? "dirty" : "saved");
  const [confirmRestart, setConfirmRestart] = useState(false);

  const data = useMemo<RaceLogData | null>(
    () => (meta && log ? { version: 1, ...meta, rounds: log.rounds, draft: log.draft } : null),
    [meta, log],
  );
  const latest = useRef(data);
  useEffect(() => {
    latest.current = data;
  }, [data]);

  // Device copy first, so a dead battery or no signal loses nothing
  useEffect(() => {
    if (data) writeLocal(storageKey, { log: data, dirty: sync !== "saved" });
  }, [data, sync, storageKey]);

  // Push to the server shortly after each change
  useEffect(() => {
    if (!data || sync !== "dirty") return;
    const timer = setTimeout(async () => {
      setSync("saving");
      let ok = false;
      try {
        ok = (await saveRaceLog(raceId, data)).ok;
      } catch {}
      // A change made while saving leaves it dirty, and that change is saved next
      setSync((current) => (latest.current !== data ? current : ok ? "saved" : "failed"));
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [data, sync, raceId]);

  // Retry after a failure: on a timer and as soon as the connection is back
  useEffect(() => {
    if (sync !== "failed") return;
    const retry = () => setSync((s) => (s === "failed" ? "dirty" : s));
    const timer = setTimeout(retry, RETRY_MS);
    window.addEventListener("online", retry);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", retry);
    };
  }, [sync]);

  const names = useMemo(() => Object.fromEntries(drivers.map((d) => [d.id, d.name])), [drivers]);
  const drawing = trackDrawing(meta?.track ?? track, meta?.laps ?? laps)!;

  if (!meta || !log) {
    return (
      <GridSetup
        drivers={drivers}
        carColors={carColors}
        onStart={(cars) => {
          const fresh = newRaceLog(track, drawing.layout.laps, cars);
          setMeta({ track: fresh.track, laps: fresh.laps, cars: fresh.cars });
          setLog({ rounds: fresh.rounds, draft: fresh.draft, history: [] });
          setSync("dirty");
        }}
      />
    );
  }

  const labels = carLabels(Object.fromEntries(meta.cars.map((c) => [c.userId, names[c.userId] ?? "?"])));
  const cars = meta.cars.map((c) => ({ id: c.userId, name: names[c.userId] ?? "?", label: labels[c.userId], color: c.color }));

  async function restart() {
    try {
      await deleteRaceLog(raceId);
    } catch {
      return;
    }
    writeLocal(storageKey, null);
    setConfirmRestart(false);
    setMeta(null);
    setLog(null);
    setSync("saved");
  }

  return (
    <>
      <RaceRecorder
        layout={drawing.layout}
        geometry={drawing.geometry}
        cars={cars}
        log={log}
        setLog={(update) => {
          setLog((current) => (typeof update === "function" ? update(current!) : update));
          setSync("dirty");
        }}
        toolbar={
          <>
            <SyncStatus sync={sync} />
            {/* Not while a save is on its way: it would bring the log back after deleting it */}
            <Button
              variant="secondary"
              size="icon"
              className="size-9"
              title={t.raceLog.restart}
              aria-label={t.raceLog.restart}
              disabled={sync === "dirty" || sync === "saving"}
              onClick={() => setConfirmRestart(true)}
            >
              <RotateCcw />
            </Button>
          </>
        }
        finishAction={
          sync === "saved" ? (
            <ButtonLink href={`/admin/carreras/${raceId}/resultados`}>
              <Flag /> {t.raceLog.toResults}
            </ButtonLink>
          ) : (
            <Button disabled>
              <Loader2 className="animate-spin" /> {t.raceLog.saving}
            </Button>
          )
        }
      />
      <Modal
        open={confirmRestart}
        onClose={() => setConfirmRestart(false)}
        title={t.raceLog.restartTitle}
        description={t.raceLog.restartDescription}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmRestart(false)}>
              {t.forms.cancel}
            </Button>
            <Button variant="danger" onClick={restart}>
              {t.raceLog.restartConfirm}
            </Button>
          </>
        }
      />
    </>
  );
}

function SyncStatus({ sync }: { sync: Sync }) {
  const [icon, label] =
    sync === "saved"
      ? [<Check key="i" />, t.raceLog.saved]
      : sync === "failed"
        ? [<CloudOff key="i" />, t.raceLog.pending]
        : [<Loader2 key="i" className="animate-spin" />, t.raceLog.saving];
  return (
    <span
      role="status"
      title={label}
      className={cn(
        "flex items-center gap-1.5 px-1 text-xs font-semibold [&_svg]:size-4",
        sync === "failed" ? "text-warning" : sync === "saved" ? "text-success" : "text-fg-muted",
      )}
    >
      {icon}
      <span className="max-sm:sr-only">{label}</span>
    </span>
  );
}

/** Fallback colours when the catalogue is empty */
const FALLBACK_COLORS = ["#d10500", "#1d4ed8", "#facc15", "#15803d", "#1c1917", "#f5f5f4", "#ea580c", "#7e22ce"];

/** Favourite colour when it's still free, otherwise the first free one. */
function defaultColors(drivers: Driver[], carColors: CarColor[]) {
  const taken = new Set<string>();
  return Object.fromEntries(
    drivers.map((d, i) => {
      const favorite = carColors.find((c) => c.id === d.favoriteColorId && !taken.has(c.id));
      const pick = favorite ?? carColors.find((c) => !taken.has(c.id));
      if (pick) taken.add(pick.id);
      return [d.id, pick?.id ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]];
    }),
  );
}

function GridSetup({ drivers, carColors, onStart }: { drivers: Driver[]; carColors: CarColor[]; onStart: (cars: LogCar[]) => void }) {
  const [order, setOrder] = useState(() => drivers.map((d) => d.id));
  const [colors, setColors] = useState(() => defaultColors(drivers, carColors));
  const byId = new Map(drivers.map((d) => [d.id, d]));
  const hexOf = (choice: string) => carColors.find((c) => c.id === choice)?.hex ?? choice;

  function move(index: number, by: number) {
    setOrder((o) => {
      const next = [...o];
      [next[index], next[index + by]] = [next[index + by], next[index]];
      return next;
    });
  }

  function shuffle() {
    setOrder((o) => {
      const next = [...o];
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
  }

  function start() {
    onStart(
      order.map((userId) => {
        const choice = colors[userId];
        const catalogued = carColors.find((c) => c.id === choice);
        return { userId, colorId: catalogued?.id ?? null, color: (catalogued?.hex ?? choice).toLowerCase() };
      }),
    );
  }

  return (
    <Card className="mx-auto w-full max-w-xl">
      <CardHeader>
        <div>
          <CardTitle>{t.raceLog.setupTitle}</CardTitle>
          <CardDescription>{t.raceLog.setupDescription}</CardDescription>
        </div>
      </CardHeader>
      <CardBody className="px-0 py-0">
        <ol className="flex flex-col divide-y divide-border">
          {order.map((id, i) => {
            const driver = byId.get(id)!;
            return (
              <li key={id} className="flex items-center gap-2 px-3 py-2 sm:px-5">
                <span className="w-5 text-right font-display text-sm font-bold tabular-nums text-fg-subtle">{i + 1}</span>
                <span className="size-4 shrink-0 rounded-sm ring-1 ring-fg/40" style={{ background: hexOf(colors[id]) }} />
                <span className="min-w-0 grow truncate font-semibold">{driver.name}</span>
                {carColors.length > 0 && (
                  <Select
                    aria-label={t.raceLog.color(driver.name)}
                    value={colors[id]}
                    onChange={(e) => setColors((c) => ({ ...c, [id]: e.target.value }))}
                    className="w-32 shrink-0"
                  >
                    {carColors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                )}
                <Button variant="ghost" size="icon" className="size-9" aria-label={t.raceLog.moveUp} disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9"
                  aria-label={t.raceLog.moveDown}
                  disabled={i === order.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown />
                </Button>
              </li>
            );
          })}
        </ol>
      </CardBody>
      <CardFooter className="justify-between">
        <Button variant="secondary" onClick={shuffle}>
          <Shuffle /> {t.raceLog.shuffle}
        </Button>
        <Button onClick={start}>
          <Flag /> {t.raceLog.start}
        </Button>
      </CardFooter>
    </Card>
  );
}
