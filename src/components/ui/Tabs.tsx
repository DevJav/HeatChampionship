"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { tabItemClass, tabListClass } from "./tabStyles";

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
