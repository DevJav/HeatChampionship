"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { tabItemClass, tabListClass } from "./tabStyles";

export type LinkTabItem = {
  href: string;
  label: React.ReactNode;
  /** Match only the exact path (for index pages like /admin) */
  exact?: boolean;
};

/** Tabs that navigate between pages; the active one follows the URL. */
export function LinkTabs({ items, className }: { items: LinkTabItem[]; className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={cn(tabListClass, className)}>
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={tabItemClass(active)}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
