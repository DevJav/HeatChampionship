import type { Metadata, Viewport } from "next";
import { Geist_Mono, Titillium_Web } from "next/font/google";
import { Suspense } from "react";
import { siteConfig } from "@/config/site";
import { siteUrl } from "@/lib/site-url";
import { MeHighlight } from "@/components/domain/MeHighlight";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import "./globals.css";

// Font CSS variables are consumed in globals.css (--font-body, --font-heading, --font-code).
// Titillium Web was the face of F1 broadcasts and formula1.com in the early 2010s.
const titillium = Titillium_Web({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
});

const codeFont = Geist_Mono({
  variable: "--font-code",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Link previews need absolute URLs: the public address of the site
  metadataBase: new URL(siteUrl()),
  title: {
    default: siteConfig.name,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

/** Phones tint their browser bar to match the header */
export const viewport: Viewport = { themeColor: "#111214" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${titillium.variable} ${codeFont.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1 py-8 sm:py-10">{children}</main>
        <SiteFooter />
        <Suspense>
          <MeHighlight />
        </Suspense>
      </body>
    </html>
  );
}
