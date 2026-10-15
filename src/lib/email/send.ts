import { randomBytes } from "node:crypto";
import { Resend } from "resend";
import { siteConfig } from "@/config/site";
import { db } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db-errors";
import { absoluteUrl } from "@/lib/site-url";
import { renderEmail, type EmailContent } from "./template";
import { parseTopics, topicNames, type EmailTopic } from "./topics";
import { t } from "@/i18n";

/**
 * Sending emails through Resend (https://resend.com). Emails are off until
 * RESEND_API_KEY is set: the profile hides the email settings and nothing is sent.
 */

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;
// onboarding@resend.dev only delivers to your own Resend account: set EMAIL_FROM to a verified domain
const FROM = process.env.EMAIL_FROM || `${siteConfig.name} <onboarding@resend.dev>`;
const REPLY_TO = process.env.EMAIL_REPLY_TO || undefined;
/** Resend's limit per batch request */
const BATCH_SIZE = 100;

export const emailEnabled = () => resend !== null;

/** Secret for a driver's unsubscribe links. */
export const newEmailToken = () => randomBytes(24).toString("base64url");

type Recipient = { contactEmail: string; emailToken: string; topics: EmailTopic[] };

/** One email to one driver, with their own unsubscribe links. */
function buildEmail(content: EmailContent, recipient: Recipient) {
  const unsubscribe = absoluteUrl(`/correo/baja?token=${recipient.emailToken}`);
  const { html, text } = renderEmail(siteConfig.name, content, {
    reason: t.email.footer(topicNames(recipient.topics)),
    links: [
      { label: t.email.managePreferences, url: absoluteUrl("/perfil#correo") },
      { label: t.email.unsubscribe, url: unsubscribe },
    ],
  });
  return {
    from: FROM,
    replyTo: REPLY_TO,
    to: recipient.contactEmail,
    subject: content.subject,
    html,
    text,
    // Lets mail apps show their own "Unsubscribe" button (one click, see /api/correo/baja)
    headers: {
      "List-Unsubscribe": `<${absoluteUrl(`/api/correo/baja?token=${recipient.emailToken}`)}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

async function subscribersTo(topic: EmailTopic): Promise<Recipient[]> {
  const users = await db.user.findMany({
    where: { contactEmail: { not: null }, emailToken: { not: null }, emailTopics: { contains: topic } },
    select: { contactEmail: true, emailToken: true, emailTopics: true, banned: true },
  });
  return users
    .map((user) => ({
      contactEmail: user.contactEmail!,
      emailToken: user.emailToken!,
      topics: parseTopics(user.emailTopics),
      banned: user.banned,
    }))
    .filter((user) => !user.banned && user.topics.includes(topic));
}

/**
 * Email everyone subscribed to `topic`, once per `key` ("race-open:<id>"…):
 * saving the same race or article again never sends it twice. Never throws,
 * so it's safe inside `after()`.
 */
export async function sendToSubscribers(key: string, topic: EmailTopic, content: EmailContent) {
  if (!resend) return;
  try {
    // Claim the key before sending, so a second save while this runs finds it taken
    await db.emailBroadcast.create({ data: { key } });
  } catch (error) {
    if (isUniqueViolation(error)) return;
    console.error("[email]", key, error);
    return;
  }

  try {
    const recipients = await subscribersTo(topic);
    let sent = 0;
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE).map((recipient) => buildEmail(content, recipient));
      const { error } = await resend.batch.send(batch);
      if (error) throw new Error(`${error.name}: ${error.message}`);
      sent += batch.length;
      await db.emailBroadcast.update({ where: { key }, data: { recipients: sent } });
    }
  } catch (error) {
    console.error("[email]", key, error);
    // Nobody got it: let the next save try again
    await db.emailBroadcast.deleteMany({ where: { key, recipients: 0 } });
  }
}

/** Confirmation after a driver adds their address, so they know it works. Never throws. */
export async function sendWelcome(userId: string) {
  if (!resend) return;
  try {
    const user = await db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { contactEmail: true, emailToken: true, emailTopics: true },
    });
    const topics = parseTopics(user.emailTopics);
    if (!user.contactEmail || !user.emailToken || topics.length === 0) return;

    const email = buildEmail(
      {
        subject: t.email.welcomeSubject,
        heading: t.email.welcomeHeading,
        paragraphs: [t.email.welcomeBody(topicNames(topics)), t.email.welcomeChange],
        button: { label: t.email.goToProfile, url: absoluteUrl("/perfil#correo") },
      },
      { contactEmail: user.contactEmail, emailToken: user.emailToken, topics },
    );
    const { error } = await resend.emails.send(email);
    if (error) throw new Error(`${error.name}: ${error.message}`);
  } catch (error) {
    console.error("[email] welcome", userId, error);
  }
}

/** The address an unsubscribe link belongs to, or null if the link is no good. */
export async function addressForToken(token: string) {
  if (!token) return null;
  const user = await db.user.findUnique({ where: { emailToken: token }, select: { contactEmail: true } });
  return user?.contactEmail ?? null;
}

/** Stop all emails for the driver the link belongs to. Returns false if the link is no good. */
export async function unsubscribe(token: string) {
  if (!token) return false;
  const { count } = await db.user.updateMany({
    where: { emailToken: token },
    data: { contactEmail: null, emailTopics: "" },
  });
  return count > 0;
}
