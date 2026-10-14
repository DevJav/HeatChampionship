import Link from "next/link";
import { siteConfig } from "@/config/site";

export function Logo() {
  return (
    <Link href="/" className="group flex shrink-0 items-center gap-2 text-bar-fg">
      <span className="flex h-8 w-10 items-center justify-center bg-primary gloss text-primary-fg clip-slant">
        <GaugeIcon className="size-5" />
      </span>
      <span className="whitespace-nowrap font-display text-lg font-bold uppercase italic leading-none tracking-wide sm:text-xl">
        {siteConfig.name}
      </span>
    </Link>
  );
}

/**
 * Rev gauge with the needle in an amber redline (it sweeps on hover). Same 24×24 grid and stroke
 * style as lucide; scripts/generate-icons.mjs draws the same paths for the
 * favicon and app icons, so keep both in sync.
 */
function GaugeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M3.34 19A10 10 0 1 1 21.27 10.25" />
      <path d="M21.27 10.25A10 10 0 0 1 20.66 19" className="stroke-accent" strokeWidth={3.6} strokeLinecap="butt" />
      <path d="M5.82 12.34 4.47 11.98M8.8 8.46 8.1 7.25M13.66 7.82 14.02 6.47" strokeWidth={1.5} />
      {/* Needle sweeps when the logo link is hovered or focused; pivots on the hub */}
      <path
        d="M12 14 18.4 12.4"
        className="origin-[12px_14px] motion-safe:group-hover:animate-needle-sweep motion-safe:group-focus-visible:animate-needle-sweep"
      />
      <circle cx="12" cy="14" r="1.8" fill="currentColor" stroke="none" />
    </svg>
  );
}
