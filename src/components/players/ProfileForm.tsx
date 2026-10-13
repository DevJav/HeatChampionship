"use client";

import { useActionState } from "react";
import { updateProfile } from "@/actions/profile";
import { FormLayout, SelectField, TextareaField, TextField } from "@/components/forms/FormFields";

type ProfileFormProps = {
  profile: { name: string; bio: string | null; favoriteColorId: string | null };
  colors: { id: string; name: string }[];
};

export function ProfileForm({ profile, colors }: ProfileFormProps) {
  const [state, action] = useActionState(updateProfile, {});
  return (
    <form action={action}>
      <FormLayout state={state} submitLabel="Guardar">
        <TextField
          name="name"
          label="Nombre de piloto"
          state={state}
          hint="Así apareces en la clasificación."
          defaultValue={profile.name}
        />
        <SelectField
          name="favoriteColorId"
          label="Color favorito"
          state={state}
          placeholder="Sin preferencia"
          hint="Tiñe tu avatar y tu franja cuando no se sabe con qué coche corriste."
          defaultValue={profile.favoriteColorId}
          options={colors.map((c) => ({ value: c.id, label: c.name }))}
        />
        <TextareaField
          name="bio"
          label="Sobre ti"
          state={state}
          className="md:col-span-2"
          placeholder="Estilo de conducción, circuito favorito, rivalidades…"
          maxLength={300}
          defaultValue={profile.bio}
        />
      </FormLayout>
    </form>
  );
}
