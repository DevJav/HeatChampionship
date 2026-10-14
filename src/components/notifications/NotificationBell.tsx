"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { fetchMyNotifications, markAllNotificationsRead, markNotificationRead } from "@/actions/notifications";
import type { NotificationFeed, NotificationItem } from "@/lib/data/notifications";
import { Button } from "@/components/ui";
import { NotificationList } from "./NotificationList";

const POLL_MS = 60_000;

/** Mark one notification read in a feed (no-op if it already was). */
export function readOne(feed: NotificationFeed, id: string): NotificationFeed {
  const target = feed.items.find((item) => item.id === id);
  if (!target || target.read) return feed;
  return {
    unread: Math.max(0, feed.unread - 1),
    items: feed.items.map((item) => (item.id === id ? { ...item, read: true } : item)),
  };
}

export function readAll(feed: NotificationFeed): NotificationFeed {
  return { unread: 0, items: feed.items.map((item) => ({ ...item, read: true })) };
}

/**
 * Header bell with the unread count and a dropdown of recent notifications.
 * Starts from the server's copy, then checks for new ones every minute while
 * the tab is visible and whenever the dropdown opens.
 */
export function NotificationBell({ initial }: { initial: NotificationFeed }) {
  const [feed, setFeed] = useState(initial);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // A server re-render (e.g. after posting a comment) brings a fresher copy
  const [seen, setSeen] = useState(initial);
  if (initial !== seen) {
    setSeen(initial);
    setFeed(initial);
  }

  useEffect(() => {
    const load = () => {
      if (document.visibilityState !== "visible") return;
      fetchMyNotifications().then((fresh) => fresh && setFeed(fresh));
    };
    const timer = setInterval(load, POLL_MS);
    document.addEventListener("visibilitychange", load);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, []);

  // Close on a click outside or Esc
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    if (!open) fetchMyNotifications().then((fresh) => fresh && setFeed(fresh));
    setOpen(!open);
  }

  function openItem(item: NotificationItem) {
    setOpen(false);
    if (item.read) return;
    setFeed((current) => readOne(current, item.id));
    markNotificationRead(item.id);
  }

  function readEverything() {
    setFeed(readAll);
    markAllNotificationsRead();
  }

  const { unread, items } = feed;
  const label = unread > 0 ? `Notificaciones (${unread} sin leer)` : "Notificaciones";

  return (
    <div ref={root} className="relative">
      <Button
        variant="inverse"
        size="icon"
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={toggle}
        className="relative"
      >
        <Bell />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-display text-[10px] leading-none font-bold text-primary-fg not-italic tabular-nums">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      {open && (
        <div
          // Full width under the header on phones; anchored to the bell from sm up
          className="fixed inset-x-4 top-[calc(var(--header-height)+0.5rem)] z-50 text-fg drop-shadow-[var(--overlay-shadow)] sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-96"
        >
          <div className="surface-panel clip-chamfer">
            <div className="flex items-center justify-between gap-3 border-l-4 border-primary surface-bar px-4 py-2.5">
              <h2 className="text-lg">Notificaciones</h2>
              {unread > 0 && (
                <Button variant="inverse" size="sm" onClick={readEverything} className="h-7 px-2 text-xs">
                  <CheckCheck /> Marcar leídas
                </Button>
              )}
            </div>
            {items.length > 0 ? (
              <NotificationList items={items} onOpen={openItem} className="max-h-[min(28rem,70vh)] overflow-y-auto" />
            ) : (
              <p className="px-4 py-8 text-center text-sm text-fg-muted">No tienes notificaciones.</p>
            )}
            <div className="border-t border-border bg-surface-2/50 px-4 py-2 text-center">
              <Link
                href="/notificaciones"
                onClick={() => setOpen(false)}
                className="text-sm font-semibold text-primary hover:underline"
              >
                Ver todas
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
