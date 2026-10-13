"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";

/** Shared tab look, also used by LinkTabs. */
export function tabItemClass(selected: boolean) {
  return cn(
    "whitespace-nowrap px-5 py-2 font-display text-sm font-bold uppercase italic tracking-wide transition-colors clip-slant focus-inset",
    selected ? "bg-primary text-primary-fg gloss" : "text-fg-muted hover:bg-surface-2 hover:text-fg",
  );
}

export const tabListClass = "flex gap-1 overflow-x-auto border-b-2 border-primary";

export type TabItem = {
  id: string;
  label: React.ReactNode;
  content: React.ReactNode;
};

type TabsProps = {
  items: TabItem[];
  defaultTab?: string;
  className?: string;
};

export function Tabs({ items, defaultTab, className }: TabsProps) {
  const [active, setActive] = useState(defaultTab ?? items[0]?.id);
  const baseId = useId();

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div role="tablist" className={tabListClass}>
        {items.map((item) => {
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.id}`}
              onClick={() => setActive(item.id)}
              className={tabItemClass(selected)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${baseId}-panel-${item.id}`}
          aria-labelledby={`${baseId}-tab-${item.id}`}
          hidden={item.id !== active}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
