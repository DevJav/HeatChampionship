import { Suspense } from "react";
import { Container, LinkTabs, PageHeader, Skeleton } from "@/components/ui";
import { AdminOnly } from "@/components/admin/AdminOnly";

const sections = [
  { href: "/admin", label: "Resumen", exact: true },
  { href: "/admin/pilotos", label: "Pilotos" },
  { href: "/admin/carreras", label: "Carreras" },
  { href: "/admin/noticias", label: "Noticias" },
  { href: "/admin/temporadas", label: "Temporadas" },
  { href: "/admin/circuitos", label: "Circuitos" },
  { href: "/admin/mejoras", label: "Mejoras" },
  { href: "/admin/colores", label: "Colores" },
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Container>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <AdminOnly>
          <PageHeader eyebrow="Organizador" title="Administración" className="pb-4" />
          <LinkTabs items={sections} className="mb-8" />
          {children}
        </AdminOnly>
      </Suspense>
    </Container>
  );
}
