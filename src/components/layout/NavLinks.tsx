"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import type { NavItem } from "@/config/site";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

type NavLinksProps = {
  items: readonly NavItem[];
  orientation?: "horizontal" | "vertical";
  onNavigate?: () => void;
};

/** Menu items for the dark broadcast bar, so they use bar colors. */
export function NavLinks({
  items,
  orientation = "horizontal",
  onNavigate,
}: NavLinksProps) {
  const pathname = usePathname();

  return (
    <ul className={cn("flex gap-1", orientation === "vertical" && "flex-col")}>
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "block px-4 py-2 font-display text-sm font-bold uppercase italic tracking-wide transition-colors clip-slant focus-inset",
                active
                  ? "bg-primary text-primary-fg gloss"
                  : "text-bar-fg/70 hover:bg-white/10 hover:text-bar-fg",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
