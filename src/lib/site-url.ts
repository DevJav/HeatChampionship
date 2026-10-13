/**
 * The public address of the site (e.g. the Cloudflare tunnel hostname), for
 * links that leave the site: WhatsApp messages, calendar invites, link previews.
 * SITE_URL wins; otherwise BETTER_AUTH_URL, which must be the public URL anyway.
 */
export function siteUrl() {
  return (process.env.SITE_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

/** "/carreras/abc" → "https://heat.example.com/carreras/abc" */
export const absoluteUrl = (path: string) => `${siteUrl()}${path}`;
