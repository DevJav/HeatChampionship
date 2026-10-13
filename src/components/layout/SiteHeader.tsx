import { siteConfig } from "@/config/site";
import { Container } from "@/components/ui";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";
import { NavLinks } from "./NavLinks";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-primary surface-bar">
      <Container className="relative flex h-(--header-height) items-center justify-between gap-4">
        <Logo />
        <nav className="hidden md:block">
          <NavLinks items={siteConfig.nav} />
        </nav>
        <div className="flex items-center gap-1">
          <MobileNav items={siteConfig.nav} />
        </div>
      </Container>
    </header>
  );
}
