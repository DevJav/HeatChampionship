import { ButtonLink } from "@/components/ui";
import { t } from "@/i18n";

type SeasonPickerProps = {
  seasons: { id: string; name: string }[];
  /** null = the all-seasons option */
  selectedId: string | null;
  /** Page the links point to */
  basePath: string;
  /** Label of a leading all-seasons option (links to basePath without a season) */
  allSeasonsLabel?: string;
};

/** Row of season links (?temporada=…); hidden when there's only one season. */
export function SeasonPicker({ seasons, selectedId, basePath, allSeasonsLabel }: SeasonPickerProps) {
  if (seasons.length < 2) return null;
  const options = [
    ...(allSeasonsLabel ? [{ id: null, name: allSeasonsLabel, href: basePath }] : []),
    ...seasons.map((season) => ({ ...season, href: `${basePath}?temporada=${season.id}` })),
  ];
  return (
    <nav aria-label={t.common.seasons} className="flex flex-wrap gap-2">
      {options.map((option) => (
        <ButtonLink
          key={option.id ?? "all"}
          href={option.href}
          size="sm"
          variant={option.id === selectedId ? "primary" : "secondary"}
          aria-current={option.id === selectedId ? "page" : undefined}
        >
          {option.name}
        </ButtonLink>
      ))}
    </nav>
  );
}
