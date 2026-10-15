"use client";

import { useActionState } from "react";
import { updateEmailPreferences } from "@/actions/profile";
import { CheckboxField, FormLayout, TextField } from "@/components/forms/FormFields";
import { EMAIL_TOPICS, parseTopics } from "@/lib/email/topics";
import { t } from "@/i18n";

type EmailPreferencesFormProps = {
  profile: { contactEmail: string | null; emailTopics: string };
};

export function EmailPreferencesForm({ profile }: EmailPreferencesFormProps) {
  const [state, action] = useActionState(updateEmailPreferences, {});
  // Everything ticked until they save an address, so adding one is a single step
  const chosen = profile.contactEmail ? parseTopics(profile.emailTopics) : EMAIL_TOPICS;
  return (
    <form action={action}>
      <FormLayout state={state} submitLabel={t.forms.save}>
        <TextField
          name="contactEmail"
          type="email"
          autoComplete="email"
          label={t.email.address}
          state={state}
          hint={t.email.addressHint}
          placeholder={t.email.addressPlaceholder}
          defaultValue={profile.contactEmail}
        />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-display text-xs font-bold uppercase tracking-wider text-fg-muted">
            {t.email.whatToReceive}
          </legend>
          {EMAIL_TOPICS.map((topic) => (
            <CheckboxField
              key={topic}
              name={`topic-${topic}`}
              label={t.email.topics[topic]}
              state={state}
              defaultChecked={chosen.includes(topic)}
            />
          ))}
        </fieldset>
      </FormLayout>
    </form>
  );
}
