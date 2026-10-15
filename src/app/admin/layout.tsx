import { Suspense } from "react";
import { Container, LinkTabs, PageHeader, Skeleton } from "@/components/ui";
import { AdminOnly } from "@/components/admin/AdminOnly";
import { t } from "@/i18n";

const sections = [
  { href: "/admin", label: t.admin.tabs.overview, exact: true },
  { href: "/admin/pilotos", label: t.admin.tabs.drivers },
  { href: "/admin/carreras", label: t.admin.tabs.races },
  { href: "/admin/noticias", label: t.admin.tabs.news },
  { href: "/admin/temporadas", label: t.admin.tabs.seasons },
  { href: "/admin/circuitos", label: t.admin.tabs.tracks },
  { href: "/admin/mejoras", label: t.admin.tabs.upgrades },
  { href: "/admin/colores", label: t.admin.tabs.colors },
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Container>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <AdminOnly>
          <PageHeader eyebrow={t.admin.organizer} title={t.admin.title} className="pb-4" />
          <LinkTabs items={sections} className="mb-8" />
          {children}
        </AdminOnly>
      </Suspense>
    </Container>
  );
}
