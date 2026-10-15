import { readFile } from "node:fs/promises";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { siteConfig } from "@/config/site";
import { OgFrame, OgTag, flagDataUri } from "@/components/og/OgFrame";
import { ARTICLE_CATEGORY } from "@/lib/articles";
import { getArticleBySlug } from "@/lib/data/articles";
import { formatDate } from "@/lib/format";
import { OG_SIZE, ogFonts } from "@/lib/og-fonts";
import { raceTitle } from "@/lib/races";
import { resolveUpload } from "@/lib/uploads";

export const alt = "Noticia del campeonato Heat";
export const size = OG_SIZE;
// JPEG: a photo as PNG weighs over a megabyte, and WhatsApp skips heavy previews
export const contentType = "image/jpeg";

/** The stored WebP cover as a JPEG data URI sized for the card (Satori can't read WebP). */
async function coverDataUri(storedPath: string | null) {
  const absolute = storedPath && resolveUpload(storedPath);
  if (!absolute) return null;
  try {
    const jpeg = await sharp(await readFile(absolute)).resize(size.width, size.height, { fit: "cover" }).jpeg({ quality: 85 }).toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Link preview for an article: its cover (else the race's flag), category and title. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  const fonts = await ogFonts();

  const image = !article ? (
    <OgFrame>
      <div style={{ display: "flex", fontSize: 110, fontWeight: 700, fontStyle: "italic", color: "#fff" }}>{siteConfig.name}</div>
    </OgFrame>
  ) : (
    <OgFrame cover={await coverDataUri(article.coverImage)} flag={flagDataUri(article.race?.track.countryCode)}>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", gap: 16 }}>
          <OgTag>{ARTICLE_CATEGORY[article.category].label}</OgTag>
          {article.race && <OgTag background="#000">{raceTitle(article.race)}</OgTag>}
        </div>
        <div
          style={{
            display: "flex",
            maxWidth: 1000,
            fontSize: article.title.length > 60 ? 64 : article.title.length > 30 ? 84 : 110,
            fontWeight: 700,
            fontStyle: "italic",
            textTransform: "uppercase",
            color: "#fff",
            lineHeight: 1,
            textShadow: "0 2px 12px rgba(0,0,0,0.5)",
          }}
        >
          {article.title}
        </div>
        {article.publishedAt && (
          <div style={{ display: "flex", fontSize: 30, color: "rgba(255,255,255,0.85)" }}>
            {formatDate(article.publishedAt)}
            {article.author ? ` · ${article.author.name}` : ""}
          </div>
        )}
      </div>
    </OgFrame>
  );

  const png = await new ImageResponse(image, { ...size, fonts }).arrayBuffer();
  const jpeg = await sharp(Buffer.from(png)).jpeg({ quality: 82 }).toBuffer();
  return new Response(new Uint8Array(jpeg), {
    // Short cache: the URL stays the same when the cover or title changes
    headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=3600" },
  });
}
