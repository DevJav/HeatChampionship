import type { Metadata } from "next";
import { Suspense } from "react";
import { ChevronRight, History } from "lucide-react";
import { ButtonLink, Card, Container, EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { ActivityByDay } from "@/components/activity/ActivityList";
import { listActivity } from "@/lib/data/activity";
import { t } from "@/i18n";

export const metadata: Metadata = {
  title: t.activity.title,
  description: t.activity.description,
};

const PAGE_SIZE = 50;

async function ActivityView({ searchParams }: { searchParams: PageProps<"/actividad">["searchParams"] }) {
  const { desde } = await searchParams;
  const after = typeof desde === "string" ? desde : undefined;
  const { items, nextCursor } = await listActivity({ limit: PAGE_SIZE, after });

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<History />}
        title={t.activity.empty}
        description={t.activity.emptyDescription}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden">
        <ActivityByDay items={items} />
      </Card>
      {nextCursor && (
        <ButtonLink href={`/actividad?desde=${nextCursor}`} variant="secondary" size="sm" className="self-center">
          {t.activity.older} <ChevronRight />
        </ButtonLink>
      )}
    </div>
  );
}

export default function ActivityPage({ searchParams }: PageProps<"/actividad">) {
  return (
    <Container className="max-w-3xl">
      <PageHeader title={t.activity.title} description={t.activity.description} />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ActivityView searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}
