"use client";

import { useActionState } from "react";
import type { Upgrade } from "@/generated/prisma/client";
import { CheckboxField, FormLayout, TextareaField, TextField } from "@/components/forms/FormFields";
import type { FormAction } from "@/lib/forms";
import { t } from "@/i18n";

export function UpgradeForm({ action, upgrade }: { action: FormAction; upgrade?: Upgrade }) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction}>
      <FormLayout state={state} submitLabel={upgrade ? t.admin.saveChanges : t.admin.upgrades.create} cancelHref="/admin/mejoras">
        <TextField name="name" label={t.admin.name} state={state} defaultValue={upgrade?.name} />
        <TextField
          name="expansion"
          label={t.admin.expansion}
          state={state}
          placeholder={t.admin.expansionPlaceholder}
          defaultValue={upgrade?.expansion}
        />
        <TextareaField
          name="description"
          label={t.admin.description}
          state={state}
          className="md:col-span-2"
          defaultValue={upgrade?.description}
        />
        <CheckboxField
          name="active"
          label={t.admin.upgrades.activeLabel}
          state={state}
          defaultChecked={upgrade?.active ?? true}
        />
      </FormLayout>
    </form>
  );
}
