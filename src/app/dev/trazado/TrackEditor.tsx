"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Redo2, RotateCcw, Save, Undo2, Wand2 } from "lucide-react";
import { Alert, Button, Card, CardBody, Field, Input, Select } from "@/components/ui";
import { TrackMap } from "@/components/race-log/TrackMap";
import {
  cumulative,
  fromGeometry,
  pointAt,
  project,
  rangeIndices,
  reproject,
  smooth,
  toGeometry,
  type EditModel,
} from "@/lib/race-log/geometry-edit";
import { dividerEnds, type Point, type TrackGeometry, type TrackLayout } from "@/lib/race-log/layout";
import { cn } from "@/lib/cn";
import { saveTrackGeometry } from "./actions";

type Track = { layout: TrackLayout; geometry: TrackGeometry };
type Mode = "line" | "dividers" | "badges";
type History = { past: EditModel[]; present: EditModel; future: EditModel[] };
type Drag =
  | { kind: "vertex" | "divider" | "badge"; index: number; before: EditModel; moved: boolean; shift: boolean }
  | { kind: "pan"; start: Point; box: Box };
type Box = [number, number, number, number];

const MODES: { id: Mode; label: string; help: string }[] = [
  {
    id: "line",
    label: "Línea central",
    help: "Arrastra los puntos. Toca uno para elegirlo y, con mayúsculas, otro para elegir un tramo; luego «Suavizar». Doble clic en la línea añade un punto; Supr borra los elegidos.",
  },
  {
    id: "dividers",
    label: "Divisiones",
    help: "Arrastra una división a lo largo de la línea. Doble clic en la línea añade una; Alt + clic en una la borra. Las curvas se marcan en grueso.",
  },
  { id: "badges", label: "Curvas", help: "Arrastra el círculo de cada límite de velocidad." },
];

const wrap = (s: number, total: number) => ((s % total) + total) % total;

export function TrackEditor({ tracks }: { tracks: Track[] }) {
  const [trackIndex, setTrackIndex] = useState(0);
  const track = tracks[trackIndex];
  const [history, setHistory] = useState<History>(() => ({ past: [], present: fromGeometry(track.geometry), future: [] }));
  const [dirty, setDirty] = useState(false);
  const [mode, setMode] = useState<Mode>("line");
  const [selection, setSelection] = useState<{ from: number | null; to: number | null }>({ from: null, to: null });
  const [photo, setPhoto] = useState<string | null>(null);
  const [opacity, setOpacity] = useState(0.8);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [saving, startSaving] = useTransition();
  const fullBox = useMemo((): Box => [0, 0, track.geometry.width, track.geometry.height], [track]);
  const [box, setBox] = useState<Box>(fullBox);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<Drag | null>(null);

  const model = history.present;
  // Until something changes, show the file's own numbers rather than re-derived ones
  const geometry = useMemo(() => (dirty ? toGeometry(model) : track.geometry), [dirty, model, track]);
  const cum = useMemo(() => cumulative(model.vertices), [model.vertices]);
  const total = cum[cum.length - 1];
  const cornerAt = useMemo(() => new Set(track.layout.corners.map((c) => c.before)), [track]);
  const expected = track.layout.spacesPerLap;

  const loadTrack = (index: number) => {
    if (dirty && !confirm("Hay cambios sin guardar. ¿Cambiar de circuito?")) return;
    const next = tracks[index];
    setTrackIndex(index);
    setHistory({ past: [], present: fromGeometry(next.geometry), future: [] });
    setDirty(false);
    setSelection({ from: null, to: null });
    setBox([0, 0, next.geometry.width, next.geometry.height]);
    setMessage(null);
  };

  /** Replace the model; `before` is pushed onto the undo stack (once per gesture) */
  const commit = useCallback((next: EditModel, before?: EditModel) => {
    setHistory((h) => ({ past: before ? [...h.past, before] : h.past, present: next, future: before ? [] : h.future }));
    setDirty(true);
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => (h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] } : h));
    setDirty(true);
  }, []);
  const redo = useCallback(() => {
    setHistory((h) => (h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h));
    setDirty(true);
  }, []);

  const selected = useMemo(() => {
    const n = model.vertices.length;
    if (selection.from === null) return [];
    if (selection.to === null) return [selection.from];
    return rangeIndices(selection.from, selection.to, n);
  }, [selection, model.vertices.length]);

  const setVertices = useCallback(
    (vertices: Point[], base: EditModel, before?: EditModel) => commit({ ...base, vertices, dividers: reproject(base, vertices) }, before),
    [commit],
  );

  const smoothSelection = () => {
    const n = model.vertices.length;
    // A single point smooths a few neighbours either side
    const indices = selected.length === 1 ? rangeIndices((selected[0] - 3 + n) % n, (selected[0] + 3) % n, n) : selected;
    if (!indices.length) return;
    setVertices(smooth(model.vertices, indices), model, model);
  };

  const deleteSelection = useCallback(() => {
    if (!selected.length || model.vertices.length - selected.length < 8) return;
    const drop = new Set(selected);
    setVertices(
      model.vertices.filter((_, i) => !drop.has(i)),
      model,
      model,
    );
    setSelection({ from: null, to: null });
  }, [selected, model, setVertices]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && mode === "line") {
        e.preventDefault();
        deleteSelection();
      } else if (e.key === "Escape") setSelection({ from: null, to: null });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, deleteSelection, mode]);

  /** Pointer position in track coordinates */
  const toTrack = (e: { clientX: number; clientY: number }): Point => {
    const svg = svgRef.current!;
    const ctm = svg.getScreenCTM()!.inverse();
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm);
    return { x: p.x, y: p.y };
  };

  // Wheel zoom around the pointer (a native listener, so the page doesn't scroll)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const ctm = svg.getScreenCTM()!.inverse();
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm);
      const k = Math.exp(e.deltaY * 0.0015);
      setBox(([x, y, w, h]) => {
        const nw = Math.min(fullBox[2] * 1.5, Math.max(40, w * k));
        const f = nw / w;
        return [p.x - (p.x - x) * f, p.y - (p.y - y) * f, nw, h * f];
      });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [fullBox]);

  // Handles keep the same size on screen whatever the zoom
  const [unit, setUnit] = useState(1);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const update = () => setUnit(box[2] / Math.max(1, svg.clientWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(svg);
    return () => ro.disconnect();
  }, [box]);

  const startDrag = (e: React.PointerEvent, kind: "vertex" | "divider" | "badge", index: number) => {
    e.stopPropagation();
    if (kind === "divider" && e.altKey) {
      if (model.dividers.length <= 3) return;
      commit({ ...model, dividers: model.dividers.filter((_, i) => i !== index) }, model);
      return;
    }
    svgRef.current!.setPointerCapture(e.pointerId);
    drag.current = { kind, index, before: model, moved: false, shift: e.shiftKey };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    svgRef.current!.setPointerCapture(e.pointerId);
    drag.current = { kind: "pan", start: { x: e.clientX, y: e.clientY }, box };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (d.kind === "pan") {
      const svg = svgRef.current!;
      const k = d.box[2] / svg.clientWidth;
      setBox([d.box[0] - (e.clientX - d.start.x) * k, d.box[1] - (e.clientY - d.start.y) * k, d.box[2], d.box[3]]);
      return;
    }
    d.moved = true;
    const p = toTrack(e);
    const base = d.before;
    if (d.kind === "vertex") {
      const vertices = base.vertices.slice();
      vertices[d.index] = p;
      setVertices(vertices, base);
    } else if (d.kind === "badge") {
      const badges = base.badges.slice();
      badges[d.index] = [p.x, p.y];
      commit({ ...base, badges });
    } else {
      // Slide along the line, staying between the neighbouring dividers
      const ds = base.dividers;
      const n = ds.length;
      const baseCum = cumulative(base.vertices);
      const loop = baseCum[baseCum.length - 1];
      const prev = ds[(d.index - 1 + n) % n];
      const next = ds[(d.index + 1) % n];
      const s = project(base.vertices, baseCum, p, wrap(prev + 3, loop), wrap(next - 3, loop)).s;
      const dividers = ds.slice();
      dividers[d.index] = s;
      commit({ ...base, dividers });
    }
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.kind === "pan") return;
    if (d.moved) {
      // One undo step per drag
      setHistory((h) => ({ past: [...h.past, d.before], present: h.present, future: [] }));
    } else if (d.kind === "vertex") {
      setSelection((sel) => (d.shift && sel.from !== null ? { from: sel.from, to: d.index } : { from: d.index, to: null }));
    }
  };

  const onLineDoubleClick = (e: React.MouseEvent) => {
    const p = toTrack(e);
    if (mode === "line") {
      // Insert a vertex on the segment nearest the click
      const s = project(model.vertices, cum, p).s;
      let i = 0;
      while (i < model.vertices.length - 1 && cum[i + 1] <= s) i++;
      const vertices = [...model.vertices.slice(0, i + 1), pointAt(model.vertices, cum, s), ...model.vertices.slice(i + 1)];
      setVertices(vertices, model, model);
    } else if (mode === "dividers") {
      const s = project(model.vertices, cum, p).s;
      const zero = model.dividers[0];
      const dividers = [...model.dividers, s].sort((a, b) => wrap(a - zero, total) - wrap(b - zero, total));
      commit({ ...model, dividers }, model);
    }
  };

  const save = () =>
    startSaving(async () => {
      const result = await saveTrackGeometry(track.layout.slug, geometry);
      if (result.ok) {
        setMessage({ tone: "success", text: `Guardado en ${result.file}. Revisa el diff y pasa los tests.` });
        setDirty(false);
      } else setMessage({ tone: "danger", text: result.error });
    });

  const r = 5 * unit;
  const countOk = model.dividers.length === expected;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardBody className="flex flex-wrap items-end gap-4">
          <Field label="Circuito" htmlFor="track">
            <Select id="track" value={trackIndex} onChange={(e) => loadTrack(Number(e.target.value))}>
              {tracks.map((t, i) => (
                <option key={t.layout.slug} value={i}>
                  {t.layout.slug}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Foto del tablero" htmlFor="photo" hint="La misma que se trazó; se estira al ancho del trazado.">
            <Input
              id="photo"
              type="file"
              accept="image/*"
              className="py-1.5"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (photo) URL.revokeObjectURL(photo);
                setPhoto(file ? URL.createObjectURL(file) : null);
              }}
            />
          </Field>
          <Field label={`Opacidad de la foto (${Math.round(opacity * 100)} %)`} htmlFor="opacity">
            <input id="opacity" type="range" min={0} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="h-10" />
          </Field>
          <Field label="Medio ancho" htmlFor="half">
            <Input
              id="half"
              type="number"
              min={5}
              max={60}
              value={model.halfWidth}
              className="w-24"
              onChange={(e) => {
                const halfWidth = Number(e.target.value);
                if (halfWidth >= 5 && halfWidth <= 60) commit({ ...model, halfWidth }, model);
              }}
            />
          </Field>
        </CardBody>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {MODES.map((m) => (
          <Button key={m.id} size="sm" variant={mode === m.id ? "primary" : "secondary"} onClick={() => setMode(m.id)}>
            {m.label}
          </Button>
        ))}
        <span className="mx-2 h-6 w-px bg-border" />
        <Button size="sm" variant="secondary" onClick={undo} disabled={!history.past.length} title="Ctrl+Z">
          <Undo2 /> Deshacer
        </Button>
        <Button size="sm" variant="secondary" onClick={redo} disabled={!history.future.length} title="Ctrl+Shift+Z">
          <Redo2 /> Rehacer
        </Button>
        {mode === "line" && (
          <Button size="sm" variant="secondary" onClick={smoothSelection} disabled={!selected.length}>
            <Wand2 /> Suavizar {selected.length > 1 ? `(${selected.length} puntos)` : ""}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => setBox(fullBox)}>
          <RotateCcw /> Ver todo
        </Button>
        <span className={cn("ml-auto text-sm", countOk ? "text-fg-muted" : "font-bold text-danger")}>
          {model.dividers.length}/{expected} casillas
        </span>
        <Button size="sm" onClick={save} disabled={!dirty || saving || !countOk}>
          <Save /> {saving ? "Guardando…" : "Guardar"}
        </Button>
      </div>
      <p className="text-sm text-fg-muted">
        {MODES.find((m) => m.id === mode)!.help} Rueda para acercar, arrastra el fondo para moverte.
      </p>
      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      <div className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-card border border-border">
          <svg
            ref={svgRef}
            viewBox={box.join(" ")}
            className="block h-auto w-full cursor-grab touch-none select-none bg-[var(--track-ground)] active:cursor-grabbing"
            style={{ aspectRatio: `${fullBox[2]} / ${fullBox[3]}` }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {photo && <image href={photo} x={0} y={0} width={fullBox[2]} height={fullBox[3]} preserveAspectRatio="none" opacity={opacity} />}
            <path
              d={geometry.path}
              fill="none"
              stroke="var(--track-asphalt)"
              strokeOpacity={photo ? 0.35 : 1}
              strokeWidth={geometry.halfWidth * 2}
              strokeLinejoin="round"
            />
            {/* Wide invisible stroke to catch double clicks on the line */}
            <path d={geometry.path} fill="none" stroke="transparent" strokeWidth={geometry.halfWidth * 2} onDoubleClick={onLineDoubleClick} />
            <path d={geometry.path} fill="none" stroke="var(--accent)" strokeWidth={1.5 * unit} pointerEvents="none" />

            {geometry.dividers.map((_, i) => {
              const [a, b] = dividerEnds(geometry, i);
              const corner = cornerAt.has(i);
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={i === 0 ? "#22c55e" : corner ? "#facc15" : "#ef4444"}
                  strokeWidth={(corner || i === 0 ? 3 : 1.5) * unit}
                  pointerEvents="none"
                />
              );
            })}
            {geometry.spaces.map(([x, y], i) => (
              <text
                key={i}
                x={x}
                y={y}
                dy="0.35em"
                textAnchor="middle"
                fontSize={10 * unit}
                className="fill-white font-bold"
                stroke="black"
                strokeWidth={2.5 * unit}
                paintOrder="stroke"
                pointerEvents="none"
              >
                {i}
              </text>
            ))}

            {track.layout.corners.map((corner, i) => {
              const [x, y] = model.badges[i];
              return (
                <g key={i} onPointerDown={mode === "badges" ? (e) => startDrag(e, "badge", i) : undefined} className={mode === "badges" ? "cursor-move" : undefined}>
                  <circle cx={x} cy={y} r={15} fill="var(--surface)" stroke="var(--track-asphalt)" strokeWidth={2.5} opacity={mode === "badges" ? 1 : 0.7} />
                  <text x={x} y={y} dy="0.35em" textAnchor="middle" className="fill-fg font-display text-[18px] font-bold" pointerEvents="none">
                    {corner.limit}
                  </text>
                </g>
              );
            })}

            {mode === "line" &&
              model.vertices.map((v, i) => (
                <circle
                  key={i}
                  cx={v.x}
                  cy={v.y}
                  r={r * 0.8}
                  fill={selected.includes(i) ? "var(--accent)" : "white"}
                  stroke="black"
                  strokeWidth={unit}
                  className="cursor-move"
                  onPointerDown={(e) => startDrag(e, "vertex", i)}
                />
              ))}
            {mode === "dividers" &&
              geometry.dividers.map(([x, y], i) => (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={r}
                  fill={cornerAt.has(i) ? "#facc15" : "white"}
                  stroke="black"
                  strokeWidth={unit}
                  className="cursor-ew-resize"
                  onPointerDown={(e) => startDrag(e, "divider", i)}
                />
              ))}
          </svg>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold">Así se verá</p>
          <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-card border border-border">
            {countOk ? (
              <TrackMap layout={track.layout} geometry={geometry} cars={[]} distances />
            ) : (
              <p className="p-4 text-sm text-danger">
                El número de divisiones ({model.dividers.length}) no coincide con las casillas del circuito ({expected}).
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
