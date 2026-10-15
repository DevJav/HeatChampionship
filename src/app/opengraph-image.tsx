import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";
import { OgFrame, OgTag } from "@/components/og/OgFrame";
import { OG_SIZE, ogFonts } from "@/lib/og-fonts";
import { t } from "@/i18n";

export const alt = siteConfig.name;
export const size = OG_SIZE;
export const contentType = "image/png";

/** Default link preview for every page without its own. */
export default async function Image() {
  return new ImageResponse(
    (
      <OgFrame>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex" }}>
            <OgTag>{t.og.tagline}</OgTag>
          </div>
          <div style={{ display: "flex", fontSize: 120, fontWeight: 700, fontStyle: "italic", textTransform: "uppercase", color: "#fff", lineHeight: 1 }}>
            {siteConfig.name}
          </div>
          <div style={{ display: "flex", fontSize: 34, color: "rgba(255,255,255,0.8)", maxWidth: 900 }}>
            {siteConfig.description}
          </div>
        </div>
      </OgFrame>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
