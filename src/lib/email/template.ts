/**
 * The HTML of every email: a red bar with the championship name, a heading,
 * a few paragraphs, one button, and the footer with the unsubscribe links.
 * Inline styles and tables only, which is what email clients understand.
 */

export type EmailContent = {
  subject: string;
  heading: string;
  paragraphs: string[];
  button: { label: string; url: string };
};

export type EmailFooter = {
  /** Why they get it: "Recibes este correo porque…" */
  reason: string;
  links: { label: string; url: string }[];
};

const RED = "#d10500";
const DARK = "#111214";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

export function renderEmail(siteName: string, content: EmailContent, footer: EmailFooter) {
  const paragraphs = content.paragraphs
    .map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#333;">${escapeHtml(p)}</p>`)
    .join("");
  const footerLinks = footer.links
    .map((link) => `<a href="${escapeHtml(link.url)}" style="color:#666;">${escapeHtml(link.label)}</a>`)
    .join(" · ");

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px 12px;background:#f2f2f2;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#fff;">
<tr><td style="background:${DARK};border-left:6px solid ${RED};padding:14px 24px;color:#fff;font-weight:bold;font-style:italic;letter-spacing:1px;text-transform:uppercase;">${escapeHtml(siteName)}</td></tr>
<tr><td style="padding:28px 24px 12px;">
<h1 style="margin:0 0 16px;font-size:22px;color:${DARK};">${escapeHtml(content.heading)}</h1>
${paragraphs}
<a href="${escapeHtml(content.button.url)}" style="display:inline-block;margin:8px 0 16px;background:${RED};color:#fff;font-weight:bold;padding:12px 24px;text-decoration:none;">${escapeHtml(content.button.label)}</a>
</td></tr>
<tr><td style="padding:16px 24px 24px;border-top:1px solid #eee;font-size:12px;line-height:1.5;color:#888;">${escapeHtml(footer.reason)}<br>${footerLinks}</td></tr>
</table>
</body></html>`;

  const text = [
    content.heading,
    "",
    ...content.paragraphs.flatMap((p) => [p, ""]),
    `${content.button.label}: ${content.button.url}`,
    "",
    "--",
    footer.reason,
    ...footer.links.map((link) => `${link.label}: ${link.url}`),
  ].join("\n");

  return { html, text };
}
