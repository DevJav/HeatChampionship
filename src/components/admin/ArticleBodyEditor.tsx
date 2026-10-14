"use client";

import { useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import {
  AtSign,
  Bold,
  Flag,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Table2,
  Trophy,
} from "lucide-react";
import { previewArticle } from "@/actions/article-preview";
import { replaceSelection } from "@/components/forms/textareaEdit";
import { embedSnippet, type EmbedKind } from "@/lib/articles";
import type { ArticleEditorOptions } from "@/lib/data/articles";
import type { FormState } from "@/lib/forms";
import { RACE_STATUS, raceTitle } from "@/lib/races";
import { cn } from "@/lib/cn";
import { Button, Field, Label, Modal, Select, Spinner } from "@/components/ui";
import { MentionTextarea } from "@/components/forms/MentionTextarea";
import { tabItemClass, tabListClass } from "@/components/ui/tabStyles";

// ---------------------------------------------------------------------------
// Toolbar edits
// ---------------------------------------------------------------------------

/** **selection**, or a placeholder to type over. */
function wrap(textarea: HTMLTextAreaElement, before: string, after: string, placeholder: string) {
  const { selectionStart, selectionEnd, value } = textarea;
  const selected = value.slice(selectionStart, selectionEnd) || placeholder;
  replaceSelection(textarea, before + selected + after, before.length, before.length + selected.length);
}

/** Prefix every selected line, e.g. "- " for a list. */
function prefixLines(textarea: HTMLTextAreaElement, prefix: (index: number) => string) {
  const { selectionStart, selectionEnd, value } = textarea;
  const lineStart = selectionStart === 0 ? 0 : value.lastIndexOf("\n", selectionStart - 1) + 1;
  textarea.setSelectionRange(lineStart, selectionEnd);
  const lines = value.slice(lineStart, selectionEnd).split("\n");
  replaceSelection(textarea, lines.map((line, i) => prefix(i) + line).join("\n"));
}

/** Insert on its own paragraph (embeds and tables need a line to themselves). */
function insertBlock(textarea: HTMLTextAreaElement, block: string) {
  const { selectionStart, selectionEnd, value } = textarea;
  const before = value.slice(0, selectionStart);
  const after = value.slice(selectionEnd);
  const lead = before === "" || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const trail = after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";
  replaceSelection(textarea, lead + block + trail);
}

const TABLE_TEMPLATE = "| Piloto | Puntos |\n| --- | ---: |\n| Nombre | 0 |";

// ---------------------------------------------------------------------------
// Pickers
// ---------------------------------------------------------------------------

type Picker = "driver" | "race" | "standings";

const RACE_EMBEDS: { kind: EmbedKind; label: string; finishedOnly: boolean }[] = [
  { kind: "carrera", label: "Tarjeta de la carrera (cuenta atrás e inscripción, o podio)", finishedOnly: false },
  { kind: "resultados", label: "Tabla de resultados", finishedOnly: true },
  { kind: "podio", label: "Podio", finishedOnly: true },
  { kind: "clasificacion-tras", label: "Clasificación del campeonato tras la carrera", finishedOnly: true },
];

type PickerProps = {
  options: ArticleEditorOptions;
  onClose: () => void;
  /** Close, then insert inline text at the cursor */
  onInsertText: (text: string) => void;
  /** Close, then insert a block on its own line */
  onInsertBlock: (block: string) => void;
};

function DriverPicker({ options, onClose, onInsertText, onInsertBlock }: PickerProps) {
  const [username, setUsername] = useState(options.drivers[0]?.username ?? "");
  const [as, setAs] = useState<"mention" | "card">("mention");
  const driver = options.drivers.find((d) => d.username === username);

  function insert() {
    if (!driver) return;
    if (as === "mention") onInsertText(`@${driver.username} `);
    else onInsertBlock(embedSnippet("piloto", driver.username, driver.name));
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Mencionar piloto"
      description="La mención enlaza a su perfil y lleva su color. También puedes escribir @usuario directamente."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={insert} disabled={!driver}>
            Insertar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Piloto" htmlFor="picker-driver">
          <Select id="picker-driver" value={username} onChange={(e) => setUsername(e.target.value)}>
            {options.drivers.map((d) => (
              <option key={d.username} value={d.username}>
                {d.name} (@{d.username})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Cómo" htmlFor="picker-driver-as">
          <Select id="picker-driver-as" value={as} onChange={(e) => setAs(e.target.value as typeof as)}>
            <option value="mention">Mención en el texto</option>
            <option value="card">Ficha del piloto (bloque con sus estadísticas)</option>
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

function RacePicker({ options, onClose, onInsertBlock, initialRaceId }: PickerProps & { initialRaceId: string }) {
  const [raceId, setRaceId] = useState(initialRaceId || options.races[0]?.id || "");
  const [kind, setKind] = useState<EmbedKind>("carrera");
  const race = options.races.find((r) => r.id === raceId);
  const finished = race?.status === "FINISHED";
  const choice = RACE_EMBEDS.find((e) => e.kind === kind)!;

  function insert() {
    if (!race) return;
    onInsertBlock(embedSnippet(kind, race.id, raceTitle(race)));
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Insertar carrera"
      description="Los datos se leen en directo: la tarjeta pasa de cuenta atrás a podio cuando termina la carrera."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={insert} disabled={!race}>
            Insertar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Carrera" htmlFor="picker-race">
          <Select id="picker-race" value={raceId} onChange={(e) => setRaceId(e.target.value)}>
            {options.races.map((r) => (
              <option key={r.id} value={r.id}>
                {r.season.name} · {raceTitle(r)} ({RACE_STATUS[r.status].label.toLowerCase()})
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Qué mostrar"
          htmlFor="picker-race-kind"
          hint={
            choice.finishedOnly && !finished
              ? "La carrera aún no ha terminado: el bloque aparecerá cuando tenga resultados."
              : undefined
          }
        >
          <Select id="picker-race-kind" value={kind} onChange={(e) => setKind(e.target.value as EmbedKind)}>
            {RACE_EMBEDS.map((e) => (
              <option key={e.kind} value={e.kind}>
                {e.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

function StandingsPicker({ options, onClose, onInsertBlock }: PickerProps) {
  const [seasonId, setSeasonId] = useState("");

  function insert() {
    const season = options.seasons.find((s) => s.id === seasonId);
    onInsertBlock(season ? embedSnippet("clasificacion", season.id, season.name) : embedSnippet("clasificacion"));
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Insertar clasificación"
      description="La tabla del campeonato, siempre al día. Para la clasificación justo después de una carrera, usa «Insertar carrera»."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={insert}>Insertar</Button>
        </>
      }
    >
      <Field label="Temporada" htmlFor="picker-season">
        <Select id="picker-season" value={seasonId} onChange={(e) => setSeasonId(e.target.value)}>
          <option value="">La temporada en curso (cambia sola)</option>
          {options.seasons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </Field>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

function ToolButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button variant="ghost" size="icon" title={label} aria-label={label} onClick={onClick} className="size-9">
      {children}
    </Button>
  );
}

type ArticleBodyEditorProps = {
  state: FormState;
  defaultValue?: string | null;
  options: ArticleEditorOptions;
  className?: string;
};

/** Markdown textarea with a formatting toolbar, pickers for live blocks and a server-rendered preview. */
export function ArticleBodyEditor({ state, defaultValue, options, className }: ArticleBodyEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [preview, setPreview] = useState<React.ReactNode>(null);
  const [loading, startPreview] = useTransition();
  const [picker, setPicker] = useState<Picker | null>(null);
  const [pickerRaceId, setPickerRaceId] = useState("");
  const error = state.fieldErrors?.body;

  /** Run an edit on the textarea (always mounted, hidden while previewing). */
  function edit(fn: (textarea: HTMLTextAreaElement) => void) {
    if (ref.current) fn(ref.current);
  }

  function showPreview() {
    setMode("preview");
    const body = ref.current?.value ?? "";
    startPreview(async () => setPreview(await previewArticle(body)));
  }

  /** The race chosen in the form's "Carrera" field, as the picker's default. */
  function linkedRaceId() {
    const field = ref.current?.form?.elements.namedItem("raceId");
    return field instanceof HTMLSelectElement ? field.value : "";
  }

  function openRacePicker() {
    setPickerRaceId(linkedRaceId());
    setPicker("race");
  }

  /** The open dialog makes the rest of the page inert: close it first so the textarea can take focus. */
  function closeThen(fn: (textarea: HTMLTextAreaElement) => void) {
    flushSync(() => setPicker(null));
    if (ref.current) fn(ref.current);
  }

  const pickerProps: PickerProps = {
    options,
    onClose: () => closeThen((textarea) => textarea.focus()),
    onInsertText: (text) => closeThen((textarea) => replaceSelection(textarea, text)),
    onInsertBlock: (block) => closeThen((textarea) => insertBlock(textarea, block)),
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor="body">Contenido</Label>
      <div className={tabListClass} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "write"}
          className={tabItemClass(mode === "write")}
          onClick={() => setMode("write")}
        >
          Escribir
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "preview"}
          className={tabItemClass(mode === "preview")}
          onClick={showPreview}
        >
          Vista previa
        </button>
      </div>

      <div hidden={mode !== "write"} className="flex flex-col gap-1.5">
        <div role="toolbar" aria-label="Formato" className="flex flex-wrap items-center gap-0.5 border-b border-border pb-1.5">
          <ToolButton label="Negrita" onClick={() => edit((t) => wrap(t, "**", "**", "texto"))}>
            <Bold />
          </ToolButton>
          <ToolButton label="Cursiva" onClick={() => edit((t) => wrap(t, "*", "*", "texto"))}>
            <Italic />
          </ToolButton>
          <ToolButton label="Título de sección" onClick={() => edit((t) => prefixLines(t, () => "## "))}>
            <Heading2 />
          </ToolButton>
          <ToolButton label="Lista" onClick={() => edit((t) => prefixLines(t, () => "- "))}>
            <List />
          </ToolButton>
          <ToolButton label="Lista numerada" onClick={() => edit((t) => prefixLines(t, (i) => `${i + 1}. `))}>
            <ListOrdered />
          </ToolButton>
          <ToolButton label="Cita" onClick={() => edit((t) => prefixLines(t, () => "> "))}>
            <Quote />
          </ToolButton>
          <ToolButton
            label="Enlace"
            onClick={() => edit((t) => {
              const label = t.value.slice(t.selectionStart, t.selectionEnd) || "texto del enlace";
              // Select the URL so it can be pasted over
              replaceSelection(t, `[${label}](https://)`, label.length + 3, label.length + 11);
            })}
          >
            <Link2 />
          </ToolButton>
          <ToolButton label="Tabla" onClick={() => edit((t) => insertBlock(t, TABLE_TEMPLATE))}>
            <Table2 />
          </ToolButton>
          <span aria-hidden className="mx-1 h-6 w-px bg-border" />
          <Button variant="ghost" size="sm" onClick={() => setPicker("driver")} disabled={options.drivers.length === 0}>
            <AtSign /> Piloto
          </Button>
          <Button variant="ghost" size="sm" onClick={openRacePicker} disabled={options.races.length === 0}>
            <Flag /> Carrera
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPicker("standings")}>
            <Trophy /> Clasificación
          </Button>
        </div>
        <MentionTextarea
          ref={ref}
          drivers={options.drivers}
          id="body"
          name="body"
          rows={22}
          aria-invalid={error ? true : undefined}
          defaultValue={state.values?.body ?? defaultValue ?? ""}
          placeholder={"Escribe aquí. **Negrita**, *cursiva*, ## Títulos, listas con -…\nEscribe @ para mencionar a un piloto."}
          className="font-mono text-sm leading-6"
        />
      </div>

      {mode === "preview" && (
        <div className="min-h-64 border border-dashed border-border-strong p-4 sm:p-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : (
            preview
          )}
        </div>
      )}

      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-xs text-fg-subtle">
          Markdown. Los bloques <code>{"{{…}}"}</code> muestran datos en directo; el texto tras <code>|</code> es solo una
          etiqueta para ti.
        </p>
      )}

      {picker === "driver" && <DriverPicker {...pickerProps} />}
      {picker === "race" && <RacePicker {...pickerProps} initialRaceId={pickerRaceId} />}
      {picker === "standings" && <StandingsPicker {...pickerProps} />}
    </div>
  );
}
