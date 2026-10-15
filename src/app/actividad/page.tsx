import type { Metadata } from "next";
import { Suspense } from "react";
import { ChevronRight, History } from "lucide-react";
import { ButtonLink, Card, Container, EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { ActivityByDay } from "@/components/activity/ActivityList";
import { listActivity } from "@/lib/data/activity";

export const metadata: Metadata = {
  title: "Actividad",
  description: "Lo último del campeonato: nuevos pilotos, inscripciones, resultados y más.",
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
        title="Todavía no hay actividad"
        description="Aquí aparecerán los nuevos pilotos, las inscripciones y los resultados."
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
          Más antigua <ChevronRight />
        </ButtonLink>
      )}
    </div>
  );
}

export default function ActivityPage({ searchParams }: PageProps<"/actividad">) {
  return (
    <Container className="max-w-3xl">
      <PageHeader title="Actividad" description="Lo último del campeonato: nuevos pilotos, inscripciones, resultados y más." />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ActivityView searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}
