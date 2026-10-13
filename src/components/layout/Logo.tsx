import Link from "next/link";
import { Flame } from "lucide-react";
import { siteConfig } from "@/config/site";

export function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2 text-bar-fg">
      <span className="flex h-8 w-10 items-center justify-center bg-primary gloss text-primary-fg clip-slant">
        <Flame className="size-5" />
      </span>
      <span className="whitespace-nowrap font-display text-lg font-bold uppercase italic leading-none tracking-wide sm:text-xl">
        {siteConfig.name}
      </span>
    </Link>
  );
}
