import { Skeleton } from "@/components/ui";

/** Placeholder while a form that depends on request data streams in. */
export function FormSkeleton({ fields }: { fields: number }) {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="mt-2 h-12 w-full" />
    </div>
  );
}
