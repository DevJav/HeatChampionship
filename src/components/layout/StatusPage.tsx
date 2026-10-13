import { ChequeredStrip, Container, SpeedStripes } from "@/components/ui";

type StatusPageProps = {
  /** Big code on the board, e.g. "404" */
  code: string;
  title: string;
  description: React.ReactNode;
  /** Buttons under the text */
  actions?: React.ReactNode;
  /** Small print, e.g. an error reference */
  footnote?: React.ReactNode;
};

/** Full-width broadcast panel for 404 and error pages. */
export function StatusPage({ code, title, description, actions, footnote }: StatusPageProps) {
  return (
    <Container>
      <section className="relative overflow-hidden border-l-4 border-primary surface-bar clip-chamfer">
        <SpeedStripes className="absolute inset-y-0 right-0 w-1/2 opacity-70" />
        <div className="relative flex flex-col items-start gap-4 px-6 py-12 sm:px-10 sm:py-16">
          <span className="font-display text-7xl font-bold italic leading-none text-primary sm:text-9xl">{code}</span>
          <h1 className="text-4xl sm:text-6xl">{title}</h1>
          <p className="max-w-xl text-bar-fg/80">{description}</p>
          {actions && <div className="flex flex-wrap gap-2 pt-2">{actions}</div>}
          {footnote && <p className="text-xs text-bar-fg/50">{footnote}</p>}
        </div>
        <ChequeredStrip className="relative text-bar-fg/80" />
      </section>
    </Container>
  );
}
