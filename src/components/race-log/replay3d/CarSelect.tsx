"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { controlClass } from "@/components/ui/Form";
import { cn } from "@/lib/cn";

export type CarOption = { id: string; name: string; color: string };

type CarSelectProps = {
  cars: CarOption[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  className?: string;
};

/** The driver's colour, outlined so white and black cars show on any background */
function Swatch({ color }: { color: string }) {
  return <span className="size-3.5 shrink-0 rounded-sm border border-black/30 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.35)]" style={{ background: color }} />;
}

/**
 * A dropdown of drivers that shows each one's colour, which is quicker to spot
 * than a name. The list floats over the page (fixed), so the player's card
 * doesn't cut it off, and opens upwards when there's no room below.
 */
export function CarSelect({ cars, value, onChange, label, className }: CarSelectProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [place, setPlace] = useState<{ left: number; top?: number; bottom?: number; minWidth: number; maxHeight: number } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const current = cars.find((car) => car.id === value) ?? cars[0];

  function show() {
    const rect = button.current!.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - 8;
    const above = rect.top - 8;
    const wanted = Math.min(320, cars.length * 36 + 8);
    const down = below >= wanted || below >= above;
    setPlace({
      left: rect.left,
      minWidth: rect.width,
      maxHeight: Math.max(120, Math.min(320, down ? below : above)),
      ...(down ? { top: rect.bottom + 4 } : { bottom: window.innerHeight - rect.top + 4 }),
    });
    setActive(Math.max(0, cars.findIndex((car) => car.id === value)));
    setOpen(true);
  }

  function pick(index: number) {
    const car = cars[index];
    if (car) onChange(car.id);
    setOpen(false);
    button.current?.focus();
  }

  // Close on a click elsewhere, or when the page scrolls or resizes under it
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!button.current?.contains(e.target as Node) && !list.current?.contains(e.target as Node)) setOpen(false);
    };
    const close = (e: Event) => {
      if (!list.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", outside);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("pointerdown", outside);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  // Keep the highlighted driver in view
  useEffect(() => {
    if (open) (list.current?.children[active] as HTMLElement | undefined)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        show();
      }
      return;
    }
    if (e.key === "ArrowDown") setActive((a) => Math.min(cars.length - 1, a + 1));
    else if (e.key === "ArrowUp") setActive((a) => Math.max(0, a - 1));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(cars.length - 1);
    else if (e.key === "Enter" || e.key === " ") pick(active);
    else if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
      if (e.key === "Tab") return;
    } else return;
    e.preventDefault();
    // Space and the arrows mustn't reach the timeline's shortcuts
    e.stopPropagation();
  }

  return (
    <>
      <button
        ref={button}
        type="button"
        role="combobox"
        aria-label={label}
        title={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        className={cn(controlClass, "flex h-8 w-auto items-center gap-2 pr-2 text-left text-sm", className)}
      >
        {current && <Swatch color={current.color} />}
        <span className="truncate">{current?.name}</span>
        <ChevronDown className="ml-auto size-4 shrink-0 text-fg-muted" />
      </button>
      {open && place && (
        <ul
          ref={list}
          id={id}
          role="listbox"
          aria-label={label}
          className="fixed z-50 overflow-y-auto rounded-control border border-border bg-surface py-1 text-sm shadow-lg"
          style={{ left: place.left, top: place.top, bottom: place.bottom, minWidth: place.minWidth, maxHeight: place.maxHeight }}
        >
          {cars.map((car, i) => (
            <li
              key={car.id}
              id={`${id}-${i}`}
              role="option"
              aria-selected={car.id === value}
              onPointerEnter={() => setActive(i)}
              onClick={() => pick(i)}
              className={cn("flex cursor-pointer items-center gap-2 px-3 py-1.5", i === active && "bg-surface-2")}
            >
              <Swatch color={car.color} />
              <span className="grow truncate">{car.name}</span>
              <Check className={cn("size-4 shrink-0 text-primary", car.id !== value && "invisible")} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
