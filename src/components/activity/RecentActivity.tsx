import { ChevronRight } from "lucide-react";
import { listActivity } from "@/lib/data/activity";
import { ButtonLink, Card, Section } from "@/components/ui";
import { ActivityList } from "./ActivityList";
import { t } from "@/i18n";

/**
 * The latest goings-on in the league, under the news on the home page.
 * Nothing until something has happened. Reads the DB: render inside <Suspense>.
 */
export async function RecentActivity() {
  const { items } = await listActivity({ limit: 8 });
  if (items.length === 0) return null;

  return (
    <Section
      title={t.activity.title}
      actions={
        <ButtonLink href="/actividad" variant="secondary" size="sm">
          {t.activity.seeAll} <ChevronRight />
        </ButtonLink>
      }
    >
      <Card>
        <ActivityList items={items} />
      </Card>
    </Section>
  );
}
