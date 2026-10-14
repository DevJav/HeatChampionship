import { PositionBadge } from "@/components/domain/PositionBadge";

/** Last results as position tags, most recent first. */
export function FormStrip({ form }: { form: number[] }) {
  if (form.length === 0) return <span className="text-sm text-fg-subtle">Sin carreras</span>;
  return (
    <ol className="flex gap-1" aria-label="Últimos resultados, del más reciente al más antiguo">
      {form.map((position, i) => (
        <li key={i}>
          <PositionBadge position={position} size="sm" />
        </li>
      ))}
    </ol>
  );
}
