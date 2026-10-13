"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui";
import { THEME_STORAGE_KEY } from "./ThemeScript";

export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private mode): theme still applies for this visit
    }
  }

  // Both icons render; CSS shows the right one, so server and client markup match
  return (
    <Button variant="inverse" size="icon" onClick={toggle} aria-label="Cambiar tema">
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
    </Button>
  );
}
