"use client";

import { useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import {
  AtSign,
  Bold,
  Flag,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Table2,
  Trophy,
} from "lucide-react";
import { previewArticle } from "@/actions/article-preview";
import { uploadArticleImage } from "@/actions/articles";
import { replaceSelection } from "@/components/forms/textareaEdit";
import { embedSnippet, type EmbedKind } from "@/lib/articles";
import type { ArticleEditorOptions } from "@/lib/data/articles";
import type { FormState } from "@/lib/forms";
import { RACE_STATUS, raceTitle } from "@/lib/races";
import { cn } from "@/lib/cn";
import { Button, Field, Label, Modal, Select, Spinner } from "@/components/ui";
import { MentionTextarea } from "@/components/forms/MentionTextarea";
import { tabItemClass, tabListClass } from "@/components/ui/tabStyles";
import { t } from "@/i18n";

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

/** Insert on its own paragraph (embeds, tables, images). Returns where the block starts. */
function insertBlock(textarea: HTMLTextAreaElement, block: string) {
  const { selectionStart, selectionEnd, value } = textarea;
  const before = value.slice(0, selectionStart);
  const after = value.slice(selectionEnd);
  const lead = before === "" || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const trail = after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";
  replaceSelection(textarea, lead + block + trail);
  return selectionStart + lead.length;
}

/** An uploaded image on its own line, with the cursor in its (optional) caption: ![|](url) */
function insertImage(textarea: HTMLTextAreaElement, url: string) {
  const start = insertBlock(textarea, `![](${url})`);
  textarea.setSelectionRange(start + 2, start + 2);
}

/** Image files from a paste, drop or file picker. */
const imagesIn = (files: FileList | null | undefined) => Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));

const TABLE_TEMPLATE = t.admin.articles.editor.tableTemplate;

// ---------------------------------------------------------------------------
// Pickers
// ---------------------------------------------------------------------------

type Picker = "driver" | "race" | "standings";

const RACE_EMBEDS: { kind: EmbedKind; label: string; finishedOnly: boolean }[] = [
  { kind: "carrera", label: t.admin.articles.editor.embedRaceCard, finishedOnly: false },
  { kind: "resultados", label: t.admin.articles.editor.embedResults, finishedOnly: true },
  { kind: "podio", label: t.admin.articles.editor.embedPodium, finishedOnly: true },
  { kind: "clasificacion-tras", label: t.admin.articles.editor.embedStandingsAfter, finishedOnly: true },
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
      title={t.admin.articles.editor.mentionTitle}
      description={t.admin.articles.editor.mentionDescription}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.forms.cancel}
          </Button>
          <Button onClick={insert} disabled={!driver}>
            {t.admin.articles.editor.insert}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label={t.admin.articles.editor.driver} htmlFor="picker-driver">
          <Select id="picker-driver" value={username} onChange={(e) => setUsername(e.target.value)}>
            {options.drivers.map((d) => (
              <option key={d.username} value={d.username}>
                {d.name} (@{d.username})
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t.admin.articles.editor.how} htmlFor="picker-driver-as">
          <Select id="picker-driver-as" value={as} onChange={(e) => setAs(e.target.value as typeof as)}>
            <option value="mention">{t.admin.articles.editor.asMention}</option>
            <option value="card">{t.admin.articles.editor.asCard}</option>
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
      title={t.admin.articles.editor.raceTitle}
      description={t.admin.articles.editor.raceDescription}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.forms.cancel}
          </Button>
          <Button onClick={insert} disabled={!race}>
            {t.admin.articles.editor.insert}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label={t.admin.articles.editor.race} htmlFor="picker-race">
          <Select id="picker-race" value={raceId} onChange={(e) => setRaceId(e.target.value)}>
            {options.races.map((r) => (
              <option key={r.id} value={r.id}>
                {r.season.name} · {raceTitle(r)} ({RACE_STATUS[r.status].label.toLowerCase()})
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={t.admin.articles.editor.whatToShow}
          htmlFor="picker-race-kind"
          hint={
            choice.finishedOnly && !finished
              ? t.admin.articles.editor.notFinishedHint
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
      title={t.admin.articles.editor.standingsTitle}
      description={t.admin.articles.editor.standingsDescription}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.forms.cancel}
          </Button>
          <Button onClick={insert}>{t.admin.articles.editor.insert}</Button>
        </>
      }
    >
      <Field label={t.admin.articles.editor.season} htmlFor="picker-season">
        <Select id="picker-season" value={seasonId} onChange={(e) => setSeasonId(e.target.value)}>
          <option value="">{t.admin.articles.editor.currentSeason}</option>
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
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const error = state.fieldErrors?.body;

  /** Run an edit on the textarea (always mounted, hidden while previewing). */
  function edit(fn: (textarea: HTMLTextAreaElement) => void) {
    if (ref.current) fn(ref.current);
  }

  /** Upload images one by one, each inserted where the cursor is when it's ready. */
  async function uploadImages(files: File[]) {
    if (files.length === 0) return;
    setUploadError(null);
    setUploading((n) => n + files.length);
    for (const file of files) {
      const data = new FormData();
      data.append("image", file);
      try {
        const result = await uploadArticleImage(data);
        if ("error" in result) setUploadError(result.error);
        else edit((ta) => insertImage(ta, result.url));
      } catch {
        setUploadError(t.admin.articles.editor.uploadFailed(file.name));
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  function showPreview() {
    setMode("preview");
    const body = ref.current?.value ?? "";
    startPreview(async () => setPreview(await previewArticle(body)));
  }

  /** The race chosen in the form's race field, as the picker's default. */
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
      <Label htmlFor="body">{t.admin.articles.editor.content}</Label>
      <div className={tabListClass} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "write"}
          className={tabItemClass(mode === "write")}
          onClick={() => setMode("write")}
        >
          {t.admin.articles.editor.write}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "preview"}
          className={tabItemClass(mode === "preview")}
          onClick={showPreview}
        >
          {t.admin.articles.editor.preview}
        </button>
      </div>

      <div hidden={mode !== "write"} className="flex flex-col gap-1.5">
        <div role="toolbar" aria-label={t.admin.articles.editor.formatting} className="flex flex-wrap items-center gap-0.5 border-b border-border pb-1.5">
          <ToolButton label={t.admin.articles.editor.bold} onClick={() => edit((ta) => wrap(ta, "**", "**", t.admin.articles.editor.textPlaceholder))}>
            <Bold />
          </ToolButton>
          <ToolButton label={t.admin.articles.editor.italic} onClick={() => edit((ta) => wrap(ta, "*", "*", t.admin.articles.editor.textPlaceholder))}>
            <Italic />
          </ToolButton>
          <ToolButton label={t.admin.articles.editor.heading} onClick={() => edit((ta) => prefixLines(ta, () => "## "))}>
            <Heading2 />
          </ToolButton>
          <ToolButton label={t.admin.articles.editor.list} onClick={() => edit((ta) => prefixLines(ta, () => "- "))}>
            <List />
          </ToolButton>
          <ToolButton label={t.admin.articles.editor.numberedList} onClick={() => edit((ta) => prefixLines(ta, (i) => `${i + 1}. `))}>
            <ListOrdered />
          </ToolButton>
          <ToolButton label={t.admin.articles.editor.quote} onClick={() => edit((ta) => prefixLines(ta, () => "> "))}>
            <Quote />
          </ToolButton>
          <ToolButton
            label={t.admin.articles.editor.link}
            onClick={() => edit((ta) => {
              const label = ta.value.slice(ta.selectionStart, ta.selectionEnd) || t.admin.articles.editor.linkPlaceholder;
              // Select the URL so it can be pasted over
              replaceSelection(ta, `[${label}](https://)`, label.length + 3, label.length + 11);
            })}
          >
            <Link2 />
          </ToolButton>
          <ToolButton label={t.admin.articles.editor.table} onClick={() => edit((ta) => insertBlock(ta, TABLE_TEMPLATE))}>
            <Table2 />
          </ToolButton>
          <ToolButton label={t.admin.articles.editor.image} onClick={() => fileInput.current?.click()}>
            {uploading > 0 ? <Spinner className="size-4" /> : <ImagePlus />}
          </ToolButton>
          {/* No name: picked files are uploaded on their own, not sent with the form */}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(event) => {
              uploadImages(imagesIn(event.target.files));
              event.target.value = "";
            }}
          />
          <span aria-hidden className="mx-1 h-6 w-px bg-border" />
          <Button variant="ghost" size="sm" onClick={() => setPicker("driver")} disabled={options.drivers.length === 0}>
            <AtSign /> {t.admin.articles.editor.driver}
          </Button>
          <Button variant="ghost" size="sm" onClick={openRacePicker} disabled={options.races.length === 0}>
            <Flag /> {t.admin.articles.editor.race}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPicker("standings")}>
            <Trophy /> {t.admin.articles.editor.standings}
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
          placeholder={t.admin.articles.editor.placeholder}
          className="font-mono text-sm leading-6"
          onPaste={(event) => {
            const images = imagesIn(event.clipboardData.files);
            if (images.length === 0) return;
            event.preventDefault();
            uploadImages(images);
          }}
          onDragOver={(event) => {
            // Allow dropping files (text drags keep the browser's behavior)
            if (event.dataTransfer.types.includes("Files")) event.preventDefault();
          }}
          onDrop={(event) => {
            const images = imagesIn(event.dataTransfer.files);
            if (images.length === 0) return;
            event.preventDefault();
            uploadImages(images);
          }}
        />
        {uploading > 0 && (
          <p className="flex items-center gap-2 text-xs text-fg-muted" role="status">
            <Spinner className="size-3.5" /> {t.admin.articles.editor.uploading(uploading)}
          </p>
        )}
        {uploadError && (
          <p className="text-xs text-danger" role="alert">
            {uploadError}
          </p>
        )}
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
          {t.admin.articles.editor.help}
        </p>
      )}

      {picker === "driver" && <DriverPicker {...pickerProps} />}
      {picker === "race" && <RacePicker {...pickerProps} initialRaceId={pickerRaceId} />}
      {picker === "standings" && <StandingsPicker {...pickerProps} />}
    </div>
  );
}
