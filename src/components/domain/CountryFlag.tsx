import * as Flags from "country-flag-icons/react/3x2";
import { cn } from "@/lib/cn";
import { countryName } from "@/lib/countries";
import { t } from "@/i18n";

// Server components only: this pulls in every flag, so keep it out of client bundles.

type FlagComponent = (props: React.SVGProps<SVGSVGElement>) => React.JSX.Element;

const FLAGS = Flags as unknown as Record<string, FlagComponent | undefined>;

/** "GB-SCT" → "GB_SCT", the flag's export name */
const flagKey = (code: string | null | undefined) => code?.replace("-", "_") ?? "";

/** A country's flag (3:2) by ISO code; renders nothing for unknown codes. */
export function CountryFlag({ code, className }: { code: string | null | undefined; className?: string }) {
  const Flag = FLAGS[flagKey(code)];
  if (!Flag) return null;
  const name = countryName(code);
  return <Flag role="img" aria-label={name ? t.layout.flagOf(name) : undefined} className={className} />;
}

/**
 * The flag filling its box as a decorative backdrop for dark banners, fading in
 * from the left. Position it absolutely inside a relative parent.
 */
export function FlagBackdrop({ code, className }: { code: string | null | undefined; className?: string }) {
  const Flag = FLAGS[flagKey(code)];
  if (!Flag) return null;
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_40%)]",
        className,
      )}
    >
      <Flag preserveAspectRatio="xMidYMid slice" className="size-full" />
    </div>
  );
}
