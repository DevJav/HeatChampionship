import { ButtonLink } from "@/components/ui";

type SeasonPickerProps = {
  seasons: { id: string; name: string }[];
  selectedId: string;
  /** Page the links point to */
  basePath: string;
};

/** Row of season links (?temporada=…); hidden when there's only one season. */
export function SeasonPicker({ seasons, selectedId, basePath }: SeasonPickerProps) {
  if (seasons.length < 2) return null;
  return (
    <nav aria-label="Temporadas" className="flex flex-wrap gap-2">
      {seasons.map((season) => (
        <ButtonLink
          key={season.id}
          href={`${basePath}?temporada=${season.id}`}
          size="sm"
          variant={season.id === selectedId ? "primary" : "secondary"}
          aria-current={season.id === selectedId ? "page" : undefined}
        >
          {season.name}
        </ButtonLink>
      ))}
    </nav>
  );
}
