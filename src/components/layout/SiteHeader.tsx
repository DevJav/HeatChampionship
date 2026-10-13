import { Suspense } from "react";
import { siteConfig } from "@/config/site";
import { Container } from "@/components/ui";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";
import { NavLinks, NavList } from "./NavLinks";
import { MobileUserLinks, UserMenu, UserMenuSkeleton } from "./UserMenu";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-primary surface-bar">
      <Container className="relative flex h-(--header-height) items-center justify-between gap-2 sm:gap-4">
        <Logo />
        <nav className="hidden lg:block">
          {/* Shell shows the menu unhighlighted; the active item streams in */}
          <Suspense fallback={<NavList items={siteConfig.nav} />}>
            <NavLinks items={siteConfig.nav} />
          </Suspense>
        </nav>
        <div className="flex items-center gap-1">
          <Suspense fallback={<UserMenuSkeleton />}>
            <UserMenu />
          </Suspense>
          <MobileNav items={siteConfig.nav}>
            <Suspense>
              <MobileUserLinks />
            </Suspense>
          </MobileNav>
        </div>
      </Container>
    </header>
  );
}
