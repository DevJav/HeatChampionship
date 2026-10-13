import { Suspense } from "react";
import { Skeleton } from "@/components/ui";

/**
 * Every admin page renders its content inside this boundary. Pages read the
 * database and session, and Cache Components needs those reads behind a
 * <Suspense> inside the page for navigations between admin sections to be
 * instant (a boundary in the layout doesn't count on client navigations).
 */
export function AdminSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
