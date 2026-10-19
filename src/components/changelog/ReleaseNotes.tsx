import Markdown from "react-markdown";
import { cn } from "@/lib/cn";

const styles = cn(
  "flex flex-col gap-3",
  // "### Added" / "### Nuevo"
  "[&_h3]:font-display [&_h3]:text-sm [&_h3]:font-bold [&_h3]:uppercase [&_h3]:italic [&_h3]:tracking-wide [&_h3]:text-primary",
  "[&_h3:not(:first-child)]:mt-2",
  "[&_p]:leading-7 [&_li]:pl-1 [&_li]:leading-7",
  "[&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6 [&_ul]:marker:text-primary",
  "[&_code]:rounded-sm [&_code]:bg-surface-2 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]",
);

/** The Markdown under one release of the changelog: section headings, lists and inline formatting. */
export function ReleaseNotes({ markdown }: { markdown: string }) {
  return (
    <div className={styles}>
      <Markdown>{markdown}</Markdown>
    </div>
  );
}
