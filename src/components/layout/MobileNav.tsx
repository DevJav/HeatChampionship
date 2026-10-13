"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui";
import type { NavItem } from "@/config/site";
import { NavLinks } from "./NavLinks";

export function MobileNav({ items }: { items: readonly NavItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
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
        </nav>
      )}
    </div>
  );
}
