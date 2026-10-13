import * as Flags from "country-flag-icons/react/3x2";
import { cn } from "@/lib/cn";
import { countryName } from "@/lib/countries";

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
  return <Flag role="img" aria-label={name ? `Bandera de ${name}` : undefined} className={className} />;
}

// ---------------------------------------------------------------------------
// Waving cloth
// ---------------------------------------------------------------------------

/** Every flag is 3:2; drawn on this canvas */
const W = 513;
const H = 342;

/**
 * Fold profile across the flag (0 = valley, 1 = ridge): a few sine waves so the
 * folds are irregular but smooth. The same map bends the flag and shades it,
 * so stripes rise and dip exactly where the light changes.
 */
const FOLDS = (() => {
  const wave = (x: number) =>
    0.28 * Math.sin(2 * Math.PI * 1.6 * x + 0.3) +
    0.17 * Math.sin(2 * Math.PI * 3.1 * x + 1.7) +
    0.05 * Math.sin(2 * Math.PI * 5.3 * x + 0.4);
  const samples = Array.from({ length: 51 }, (_, i) => wave(i / 50));
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  return samples.map((v, i) => ({ offset: i * 2, height: (v - min) / (max - min) }));
})();

/** The fold profile as a grayscale image (folds lean ~10° off vertical), for feImage */
const FOLD_MAP = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><linearGradient id="g" x1="0" y1="0.42" x2="1" y2="0.58">${FOLDS.map(
    ({ offset, height }) => {
      const v = Math.round(height * 255);
      return `<stop offset="${offset}%" stop-color="rgb(${v},${v},${v})"/>`;
    },
  ).join("")}</linearGradient><rect width="${W}" height="${H}" fill="url(#g)"/></svg>`,
)}`;

/** How far stripes move with the folds */
const BEND = 14;
/** How dark the valleys get (0–1) */
const SHADE_DEPTH = 0.55;
/** Fold height from which ridges start to shine (0–1) */
const SHEEN_FROM = 0.8;

const rgb = (props: React.SVGProps<SVGFEFuncRElement>) => (
  <>
    <feFuncR {...props} />
    <feFuncG {...props} />
    <feFuncB {...props} />
  </>
);

/**
 * The flag filling its box as a decorative backdrop for dark banners: waving
 * cloth (bent and shaded by the fold map) that fades in from the left.
 * Position it absolutely inside a relative parent.
 */
export function FlagBackdrop({ code, className }: { code: string | null | undefined; className?: string }) {
  const Flag = FLAGS[flagKey(code)];
  if (!Flag) return null;
  const filterId = `flag-cloth-${flagKey(code)}`;

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_40%)]",
        className,
      )}
    >
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="size-full">
        <defs>
          <filter
            id={filterId}
            filterUnits="userSpaceOnUse"
            x={0}
            y={0}
            width={W}
            height={H}
            colorInterpolationFilters="sRGB"
          >
            <feImage href={FOLD_MAP} x={0} y={0} width={W} height={H} preserveAspectRatio="none" result="raw" />
            <feGaussianBlur in="raw" stdDeviation={2} result="folds" />
            {/* Bend: stripes follow the folds */}
            <feDisplacementMap
              in="SourceGraphic"
              in2="folds"
              scale={BEND}
              xChannelSelector="B"
              yChannelSelector="R"
              result="bent"
            />
            {/* Valleys darker (multiply) */}
            <feComponentTransfer in="folds" result="shade">
              {rgb({ type: "linear", slope: SHADE_DEPTH, intercept: 1 - SHADE_DEPTH })}
            </feComponentTransfer>
            <feComposite in="bent" in2="shade" operator="arithmetic" k1={1} k2={0} k3={0} k4={0} result="shaded" />
            {/* Ridges catch the light (screen) */}
            <feComponentTransfer in="folds" result="sheen">
              {rgb({ type: "linear", slope: 0.5 / (1 - SHEEN_FROM), intercept: (-0.5 * SHEEN_FROM) / (1 - SHEEN_FROM) })}
            </feComponentTransfer>
            <feComposite in="shaded" in2="sheen" operator="arithmetic" k1={-1} k2={1} k3={1} k4={0} result="lit" />
            {/* Displacement isn't antialiased: soften the stair-steps it leaves on edges */}
            <feGaussianBlur in="lit" stdDeviation={1.1} />
          </filter>
        </defs>
        <g filter={`url(#${filterId})`}>
          {/* Slightly oversized so the bend never pulls the edges into view */}
          <g transform={`translate(${W / 2} ${H / 2}) scale(1.12) translate(${-W / 2} ${-H / 2})`}>
            <Flag width={W} height={H} />
          </g>
        </g>
      </svg>
    </div>
  );
}
