import { siteConfig } from "@/config/site";
import { ChequeredStrip, Container } from "@/components/ui";
import { t } from "@/i18n";

export function SiteFooter() {
  return (
    <footer className="mt-auto surface-bar text-sm">
      <ChequeredStrip className="text-bar-fg/80" />
      <Container className="flex flex-col justify-between gap-2 py-6 text-bar-fg/60 sm:flex-row">
        <span className="font-display font-bold uppercase italic tracking-wide text-bar-fg">
          {siteConfig.name}
        </span>
        <span>{t.layout.footer}</span>
      </Container>
    </footer>
  );
}
