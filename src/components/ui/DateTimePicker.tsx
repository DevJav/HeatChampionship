"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { toLocalInput } from "@/lib/dates";
import { addMonths, formatDayKey, formatMonth, monthOf, monthWeeks, WEEKDAYS } from "@/lib/month-calendar";
import { Button } from "./Button";
import { controlClass, Select } from "./Form";
import { t } from "@/i18n";

/** Time set when a day is picked before any time */
const DEFAULT_TIME = "20:00";

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

type DateTimePickerProps = {
  id: string;
  name: string;
  /** Madrid wall-clock time, "2026-11-14T19:30" (the format <input type="datetime-local"> posts) */
  defaultValue?: string;
  /** Allow emptying the field */
  clearable?: boolean;
  "aria-invalid"?: boolean;
};

/**
 * Date and time field with its own calendar: weeks start on Monday and dates
 * read dd/mm/yyyy whatever the browser's language (the native datetime-local
 * picker follows the browser). Posts the same value as datetime-local.
 */
export function DateTimePicker({ id, name, defaultValue = "", clearable, ...aria }: DateTimePickerProps) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState("");
  const [today, setToday] = useState("");
  const popoverId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [day, time = ""] = value ? value.split("T") : [];
  const [hour, minute] = time.split(":");

  // The panel lives in the top layer (popover), so cards' clip-paths can't cut
  // it: keep it pinned under the field, or above when there's no room below
  useEffect(() => {
    if (!open) return;
    const place = () => {
      const button = buttonRef.current!.getBoundingClientRect();
      const panel = panelRef.current!;
      const fitsBelow = button.bottom + 4 + panel.offsetHeight <= window.innerHeight;
      const top = fitsBelow || button.top < panel.offsetHeight + 4 ? button.bottom + 4 : button.top - 4 - panel.offsetHeight;
      const left = Math.max(8, Math.min(button.left, window.innerWidth - panel.offsetWidth - 8));
      panel.style.top = `${top}px`;
      panel.style.left = `${left}px`;
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  /** Runs before the popover opens: start on the chosen month, or this one. */
  function prepare() {
    if (open) return;
    const now = toLocalInput(new Date()).slice(0, 10);
    setToday(now);
    setMonth(monthOf(day ?? now));
  }

  function pickDay(key: string) {
    setValue(`${key}T${time || DEFAULT_TIME}`);
    setMonth(monthOf(key));
  }

  const setTime = (h: string, m: string) => setValue(`${day}T${h}:${m}`);

  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <button
        ref={buttonRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        popoverTarget={popoverId}
        onClick={prepare}
        className={cn(controlClass, "flex h-10 items-center gap-2 text-left tabular-nums")}
        {...aria}
      >
        <span className={cn("flex-1", !value && "text-fg-subtle")}>
          {value ? `${formatDayKey(day)} ${time}` : t.forms.datePicker.placeholder}
        </span>
        <CalendarDays className="size-4 text-fg-muted" aria-hidden />
      </button>

      <div
        ref={panelRef}
        id={popoverId}
        popover="auto"
        role="dialog"
        aria-label={t.forms.datePicker.label}
        onToggle={(e) => setOpen(e.newState === "open")}
        className="fixed inset-auto m-0 w-72 overflow-visible border-0 bg-transparent p-0 text-fg drop-shadow-[var(--overlay-shadow)]"
      >
        {open && (
          <div className="flex flex-col gap-3 bg-surface p-3 surface-panel clip-chamfer">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" aria-label={t.races.previousMonth} onClick={() => setMonth(addMonths(month, -1))}>
                <ChevronLeft />
              </Button>
              <span className="font-display text-base font-bold uppercase italic">{formatMonth(month)}</span>
              <Button variant="ghost" size="icon" aria-label={t.races.nextMonth} onClick={() => setMonth(addMonths(month, 1))}>
                <ChevronRight />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-0.5 text-center">
              {WEEKDAYS.map((weekday) => (
                <span key={weekday} className="pb-1 text-[10px] font-bold uppercase tracking-wider text-fg-muted">
                  {weekday}
                </span>
              ))}
              {monthWeeks(month)
                .flat()
                .map((cell) => (
                  <button
                    key={cell.key}
                    type="button"
                    aria-label={formatDayKey(cell.key)}
                    aria-pressed={cell.key === day}
                    onClick={() => pickDay(cell.key)}
                    className={cn(
                      "h-8 text-sm tabular-nums transition-colors focus-inset",
                      cell.key === day
                        ? "bg-primary font-bold text-primary-fg"
                        : cn("hover:bg-surface-2", cell.inMonth ? "text-fg" : "text-fg-subtle"),
                      cell.key === today && cell.key !== day && "font-bold text-primary",
                    )}
                  >
                    {cell.day}
                  </button>
                ))}
            </div>

            <div className="flex items-center gap-2 border-t border-border pt-3">
              <span className="font-display text-xs font-bold uppercase tracking-wider text-fg-muted">{t.forms.datePicker.time}</span>
              <Select
                aria-label={t.forms.datePicker.time}
                className="w-auto flex-1"
                disabled={!day}
                value={hour ?? ""}
                onChange={(e) => setTime(e.target.value, minute)}
              >
                {!day && <option value="">--</option>}
                {HOURS.map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </Select>
              <span aria-hidden>:</span>
              <Select
                aria-label={t.forms.datePicker.minutes}
                className="w-auto flex-1"
                disabled={!day}
                value={minute ?? ""}
                onChange={(e) => setTime(hour, e.target.value)}
              >
                {!day && <option value="">--</option>}
                {/* Keep an off-grid minute from an existing value selectable */}
                {(minute && !MINUTES.includes(minute) ? [...MINUTES, minute].sort() : MINUTES).map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              {clearable && value && (
                <Button variant="ghost" size="sm" onClick={() => setValue("")}>
                  {t.forms.datePicker.clear}
                </Button>
              )}
              <Button size="sm" popoverTarget={popoverId} popoverTargetAction="hide">
                {t.forms.datePicker.done}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
