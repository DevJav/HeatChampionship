"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";

export type MonthPage = {
  /** "2026-11" */
  key: string;
  label: string;
  content: React.ReactNode;
};

type MonthPagerProps = {
  months: MonthPage[];
  /** Month shown first and by "Hoy" */
  current: string;
};

/** Steps through server-rendered months one at a time. */
export function MonthPager({ months, current }: MonthPagerProps) {
  const [index, setIndex] = useState(() => Math.max(0, months.findIndex((m) => m.key === current)));
  const month = months[index];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Mes anterior"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
        >
          <ChevronLeft />
        </Button>
        <h2 aria-live="polite" className="min-w-0 flex-1 text-center text-2xl capitalize sm:flex-none sm:min-w-56">
          {month.label}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Mes siguiente"
          disabled={index === months.length - 1}
          onClick={() => setIndex(index + 1)}
        >
          <ChevronRight />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="sm:ml-auto"
          disabled={month.key === current}
          onClick={() => setIndex(months.findIndex((m) => m.key === current))}
        >
          Hoy
        </Button>
      </div>
      {months.map((m) => (
        <div key={m.key} hidden={m.key !== month.key}>
          {m.content}
        </div>
      ))}
    </div>
  );
}
