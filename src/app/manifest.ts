import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

/** Lets players add the site to their home screen; icons from scripts/generate-icons.mjs */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: "Heat",
    description: siteConfig.description,
    lang: siteConfig.locale,
    start_url: "/",
    display: "standalone",
    background_color: "#e4e5e8",
    theme_color: "#111214",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
