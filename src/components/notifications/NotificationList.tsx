"use client";

import Link from "next/link";
import { AtSign, Flag, MessageSquare, Reply, Sparkles } from "lucide-react";
import type { NotificationItem } from "@/lib/data/notifications";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/format";
import { Avatar } from "@/components/ui";
import { t } from "@/i18n";

const TYPE_ICON = {
  ARTICLE_MENTION: AtSign,
  COMMENT_MENTION: MessageSquare,
  COMMENT_REPLY: Reply,
  RACE_RESULTS: Flag,
  DRIVER_OF_THE_DAY: Sparkles,
} satisfies Record<NotificationItem["type"], unknown>;

type NotificationListProps = {
  items: NotificationItem[];
  /** Called when one is opened, to mark it read */
  onOpen: (item: NotificationItem) => void;
  className?: string;
};

/** Notifications newest first; unread ones are tinted and marked with a dot. */
export function NotificationList({ items, onOpen, className }: NotificationListProps) {
  return (
    <ul className={cn("flex flex-col", className)}>
      {items.map((item) => {
        const Icon = TYPE_ICON[item.type];
        return (
          <li key={item.id} className="border-b border-border/60 last:border-b-0">
            <Link
              href={item.href}
              onClick={() => onOpen(item)}
              className={cn(
                "flex items-start gap-3 border-l-4 px-4 py-3 text-sm transition-colors hover:bg-surface-2",
                item.read ? "border-transparent" : "border-primary bg-primary/5",
              )}
            >
              {/* The actor's avatar with the kind of notification as a badge, or just the icon */}
              <span className="relative mt-0.5 shrink-0">
                {item.actor ? (
                  <Avatar name={item.actor.name} src={item.actor.image} color={item.actor.color} size="sm" />
                ) : (
                  <span className="flex size-7 items-center justify-center surface-bar">
                    <Icon className="size-4" aria-hidden />
                  </span>
                )}
                {item.actor && (
                  <span className="absolute -right-1.5 -bottom-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-primary-fg">
                    <Icon className="size-2.5" aria-hidden />
                  </span>
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className={cn("leading-snug", !item.read && "font-semibold")}>{item.message}</span>
                <time
                  dateTime={item.createdAt.toISOString()}
                  // Relative to "now", which moves between the server render and hydration
                  suppressHydrationWarning
                  className="text-xs text-fg-subtle"
                >
                  {formatRelative(item.createdAt)}
                </time>
              </span>
              {!item.read && <span aria-label={t.notifications.unread} className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
