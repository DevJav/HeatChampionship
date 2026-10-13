"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui";
import type { NavItem } from "@/config/site";
import { NavLinks } from "./NavLinks";

type MobileNavProps = {
  items: readonly NavItem[];
  /** Extra content under the links, e.g. account actions */
  children?: React.ReactNode;
};

export function MobileNav({ items, children }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <Button
        variant="inverse"
        size="icon"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X /> : <Menu />}
      </Button>
      {open && (
        <nav className="absolute inset-x-0 top-(--header-height) border-b-2 border-primary surface-bar p-4 shadow-overlay">
          <NavLinks
            items={items}
            orientation="vertical"
            onNavigate={() => setOpen(false)}
          />
          {children && (
            // Close after the click is handled: closing synchronously would unmount
            // a clicked form before it submits (e.g. logout)
            <div
              className="mt-3 border-t border-white/15 pt-3 empty:hidden"
              onClick={() => setTimeout(() => setOpen(false))}
            >
              {children}
            </div>
          )}
        </nav>
      )}
    </div>
  );
}
