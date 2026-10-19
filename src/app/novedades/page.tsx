import type { Metadata } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Badge, Card, CardBody, CardHeader, CardTitle, Container, PageHeader } from "@/components/ui";
import { ReleaseNotes } from "@/components/changelog/ReleaseNotes";
import { changelogFile, parseChangelog } from "@/lib/changelog";
import { formatDate } from "@/lib/format";
import { locale, t } from "@/i18n";

export const metadata: Metadata = {
  title: t.changelog.title,
  description: t.changelog.description,
};

// Read at module scope: the file ships with each build and never changes while it runs
const releases = parseChangelog(readFileSync(join(process.cwd(), changelogFile[locale]), "utf8"));

export default function ChangelogPage() {
  return (
    <Container className="max-w-3xl">
      <PageHeader title={t.changelog.title} description={t.changelog.description} />
      <div className="flex flex-col gap-6">
        {releases.map(({ version, date, body }, i) => (
          <Card key={version} id={`v${version}`} className="scroll-mt-24 overflow-hidden">
            <CardHeader className="flex-wrap gap-y-1">
              <CardTitle>{t.changelog.version(version)}</CardTitle>
              <div className="flex items-center gap-3">
                {i === 0 && <Badge tone="primary">{t.changelog.latest}</Badge>}
                {/* Midday UTC, so the day is the same in the site's time zone */}
                <time dateTime={date} className="text-sm opacity-70">
                  {formatDate(new Date(`${date}T12:00:00Z`))}
                </time>
              </div>
            </CardHeader>
            <CardBody>
              <ReleaseNotes markdown={body} />
            </CardBody>
          </Card>
        ))}
      </div>
    </Container>
  );
}
