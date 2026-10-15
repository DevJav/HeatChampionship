import { PositionBadge } from "@/components/domain/PositionBadge";
import { t } from "@/i18n";

/** Last results as position tags, most recent first. */
export function FormStrip({ form }: { form: number[] }) {
  if (form.length === 0) return <span className="text-sm text-fg-subtle">{t.drivers.noRaces}</span>;
  return (
    <ol className="flex gap-1" aria-label={t.drivers.formLabel}>
      {form.map((position, i) => (
        <li key={i}>
          <PositionBadge position={position} size="sm" />
        </li>
      ))}
    </ol>
  );
}
