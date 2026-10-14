"use client";

import { useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { markAllNotificationsRead, markNotificationRead } from "@/actions/notifications";
import type { NotificationFeed } from "@/lib/data/notifications";
import { Button, Card, EmptyState } from "@/components/ui";
import { readAll, readOne } from "./NotificationBell";
import { NotificationList } from "./NotificationList";

/** The full notifications list, with "mark all as read". */
export function NotificationsPage({ initial }: { initial: NotificationFeed }) {
  const [feed, setFeed] = useState(initial);

  if (feed.items.length === 0) {
    return (
      <EmptyState
        icon={<Bell />}
        title="No tienes notificaciones"
        description="Te avisaremos cuando te mencionen, te respondan o haya resultados de tus carreras."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {feed.unread > 0 && (
        <Button
          variant="secondary"
          size="sm"
          className="self-end"
          onClick={() => {
            setFeed(readAll);
            markAllNotificationsRead();
          }}
        >
          <CheckCheck /> Marcar todas como leídas
        </Button>
      )}
      <Card>
        <NotificationList
          items={feed.items}
          onOpen={(item) => {
            if (item.read) return;
            setFeed((current) => readOne(current, item.id));
            markNotificationRead(item.id);
          }}
        />
      </Card>
    </div>
  );
}
