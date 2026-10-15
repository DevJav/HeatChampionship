import { ChevronRight } from "lucide-react";
import { listActivity } from "@/lib/data/activity";
import { ButtonLink, Card, Section } from "@/components/ui";
import { ActivityList } from "./ActivityList";

/**
 * The latest goings-on in the league, under the news on the home page.
 * Nothing until something has happened. Reads the DB: render inside <Suspense>.
 */
export async function RecentActivity() {
  const { items } = await listActivity({ limit: 8 });
  if (items.length === 0) return null;

  return (
    <Section
      title="Actividad"
      actions={
        <ButtonLink href="/actividad" variant="secondary" size="sm">
          Ver todo <ChevronRight />
        </ButtonLink>
      }
    >
      <Card>
        <ActivityList items={items} />
      </Card>
    </Section>
  );
}
