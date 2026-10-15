"use client";

import { useActionState } from "react";
import type { Track } from "@/generated/prisma/client";
import { CheckboxField, FormLayout, SelectField, TextareaField, TextField } from "@/components/forms/FormFields";
import { countryOptions } from "@/lib/countries";
import type { FormAction } from "@/lib/forms";
import { t } from "@/i18n";

const countries = countryOptions();

export function TrackForm({ action, track }: { action: FormAction; track?: Track }) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction}>
      <FormLayout state={state} submitLabel={track ? t.admin.saveChanges : t.admin.tracks.create} cancelHref="/admin/circuitos">
        <TextField name="name" label={t.admin.name} state={state} placeholder={t.admin.tracks.namePlaceholder} defaultValue={track?.name} />
        <SelectField
          name="countryCode"
          label={t.admin.tracks.country}
          hint={t.admin.tracks.countryHint}
          state={state}
          options={countries}
          placeholder={t.admin.noCountry}
          defaultValue={track?.countryCode ?? ""}
        />
        <TextField
          name="expansion"
          label={t.admin.expansion}
          state={state}
          placeholder={t.admin.expansionPlaceholder}
          defaultValue={track?.expansion}
        />
        <TextField
          name="defaultLaps"
          label={t.admin.tracks.defaultLaps}
          type="number"
          min={1}
          state={state}
          defaultValue={track?.defaultLaps}
        />
        <TextareaField
          name="description"
          label={t.admin.description}
          state={state}
          className="md:col-span-2"
          defaultValue={track?.description}
        />
        <CheckboxField
          name="active"
          label={t.admin.tracks.activeLabel}
          state={state}
          defaultChecked={track?.active ?? true}
        />
      </FormLayout>
    </form>
  );
}
