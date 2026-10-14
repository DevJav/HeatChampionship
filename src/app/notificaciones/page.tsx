import type { Metadata } from "next";
import { Suspense } from "react";
import { Container, PageHeader, Skeleton } from "@/components/ui";
import { NotificationsPage } from "@/components/notifications/NotificationsPage";
import { getNotifications } from "@/lib/data/notifications";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Notificaciones" };

async function NotificationsView() {
  const user = await requireUser("/notificaciones");
  const feed = await getNotifications(user.id, { limit: 100 });
  return <NotificationsPage initial={feed} />;
}

export default function NotificationsRoute() {
  return (
    <Container className="max-w-3xl">
      <PageHeader title="Notificaciones" />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <NotificationsView />
      </Suspense>
    </Container>
  );
}
