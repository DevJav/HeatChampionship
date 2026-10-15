/** Countries by ISO 3166-1 alpha-2 code, named in the site's language. */

import { countries, hasFlag } from "country-flag-icons";
import { siteConfig } from "@/config/site";
import { t } from "@/i18n";

const names = new Intl.DisplayNames([siteConfig.locale], { type: "region" });

/** Flags for regions that Intl can't name (others like "BQ-BO" are left out) */
const subdivisions = t.layout.subdivisions;

/** "IT" → "Italia", "GB-SCT" → "Escocia"; null for unknown codes. */
export function countryName(code: string | null | undefined) {
  if (!code || !hasFlag(code)) return null;
  if (code.includes("-")) return subdivisions[code] ?? null;
  const name = names.of(code);
  return name && name !== code ? name : null;
}

/** Every country with a flag and a name, sorted by name (for selects). */
export function countryOptions() {
  return countries
    .map((code) => ({ value: code, label: countryName(code) }))
    .filter((option): option is { value: string; label: string } => option.label != null)
    .sort((a, b) => a.label.localeCompare(b.label, siteConfig.locale));
}
