import { intlLocale, t } from "@/i18n";

/**
 * What drivers can choose to get emails about. To add one: add it here, give
 * it a label in `t.email.topics` and `t.email.topicNames`, and call
 * `sendToSubscribers` with it (see announce.ts).
 */
export const EMAIL_TOPICS = ["races", "results", "news"] as const;

export type EmailTopic = (typeof EMAIL_TOPICS)[number];

export const isEmailTopic = (value: string): value is EmailTopic => (EMAIL_TOPICS as readonly string[]).includes(value);

/** The stored "races,news" → ["races", "news"], dropping topics that no longer exist. */
export const parseTopics = (stored: string): EmailTopic[] => stored.split(",").filter(isEmailTopic);

export const serializeTopics = (topics: EmailTopic[]) => topics.join(",");

/** "carreras y noticias", for email text */
export function topicNames(topics: EmailTopic[]) {
  return new Intl.ListFormat(intlLocale, { type: "conjunction" }).format(topics.map((topic) => t.email.topicNames[topic]));
}
