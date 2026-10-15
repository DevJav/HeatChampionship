"use client";

import { useActionState } from "react";
import { updateProfile } from "@/actions/profile";
import { FormLayout, SelectField, TextareaField, TextField } from "@/components/forms/FormFields";
import { t } from "@/i18n";

type ProfileFormProps = {
  profile: { name: string; bio: string | null; favoriteColorId: string | null };
  colors: { id: string; name: string }[];
};

export function ProfileForm({ profile, colors }: ProfileFormProps) {
  const [state, action] = useActionState(updateProfile, {});
  return (
    <form action={action}>
      <FormLayout state={state} submitLabel={t.forms.save}>
        <TextField
          name="name"
          label={t.auth.driverName}
          state={state}
          hint={t.profile.driverNameHint}
          defaultValue={profile.name}
        />
        <SelectField
          name="favoriteColorId"
          label={t.profile.favoriteColor}
          state={state}
          placeholder={t.profile.noPreference}
          hint={t.profile.favoriteColorHint}
          defaultValue={profile.favoriteColorId}
          options={colors.map((c) => ({ value: c.id, label: c.name }))}
        />
        <TextareaField
          name="bio"
          label={t.profile.bio}
          state={state}
          className="md:col-span-2"
          placeholder={t.profile.bioPlaceholder}
          maxLength={300}
          defaultValue={profile.bio}
        />
      </FormLayout>
    </form>
  );
}
