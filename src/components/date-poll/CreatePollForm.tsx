"use client";

import { useActionState } from "react";
import { createDatePoll } from "@/actions/date-polls";
import { FormLayout, SelectField, TextField } from "@/components/forms/FormFields";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { formatMonth } from "@/lib/month-calendar";
import { t } from "@/i18n";

/** Admin: open a poll over whole months. `months` are the choices, `defaults` the suggested range. */
export function CreatePollForm({ months, defaults }: { months: string[]; defaults: { from: string; to: string } }) {
  const [state, formAction] = useActionState(createDatePoll, {});
  const options = months.map((month) => ({ value: month, label: formatMonth(month) }));

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t.datePoll.admin.title}</CardTitle>
          <CardDescription>{t.datePoll.admin.description}</CardDescription>
        </div>
      </CardHeader>
      <CardBody>
        <form action={formAction}>
          <FormLayout state={state} submitLabel={t.datePoll.admin.create}>
            <SelectField name="from" label={t.datePoll.admin.from} state={state} options={options} defaultValue={defaults.from} />
            <SelectField name="to" label={t.datePoll.admin.to} state={state} options={options} defaultValue={defaults.to} />
            <TextField
              name="note"
              label={t.datePoll.admin.note}
              state={state}
              className="md:col-span-2"
              maxLength={300}
              placeholder={t.datePoll.admin.notePlaceholder}
            />
          </FormLayout>
        </form>
      </CardBody>
    </Card>
  );
}
