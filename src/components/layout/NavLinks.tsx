"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import type { NavItem } from "@/config/site";
import { navItemClass } from "./navStyles";

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

type NavListProps = {
  items: readonly NavItem[];
  orientation?: "horizontal" | "vertical";
  onNavigate?: () => void;
  /** Current path, or null when not known yet (prerendered shell) */
  pathname?: string | null;
};

/** Menu items for the dark broadcast bar, so they use bar colors. */
export function NavList({ items, orientation = "horizontal", onNavigate, pathname = null }: NavListProps) {
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
              className={navItemClass(active)}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * NavList with the current page highlighted. Reading the URL makes this
 * request-time data: wrap in <Suspense fallback={<NavList items={…} />}>.
 */
export function NavLinks(props: Omit<NavListProps, "pathname">) {
  const pathname = usePathname();
  return <NavList {...props} pathname={pathname} />;
}
