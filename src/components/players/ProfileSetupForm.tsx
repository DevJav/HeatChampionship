"use client";

import { useActionState, useEffect, useState } from "react";
import { Ban } from "lucide-react";
import { completeProfileSetup } from "@/actions/profile";
import { Alert, Avatar, ButtonLink, Field, Input, SubmitButton, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";
import { needsOutline } from "@/lib/colors";

type ProfileSetupFormProps = {
  profile: { name: string; image: string | null; bio: string | null; favoriteColorId: string | null };
  colors: { id: string; name: string; hex: string }[];
};

const swatchClass =
  "flex size-9 cursor-pointer items-center justify-center rounded-full ring-offset-2 ring-offset-surface transition-shadow has-checked:ring-2 has-checked:ring-primary has-focus-visible:ring-2 has-focus-visible:ring-fg";

/** Welcome step after sign-up: photo, favorite color and bio, with a live preview of the avatar. */
export function ProfileSetupForm({ profile, colors }: ProfileSetupFormProps) {
  const [state, action] = useActionState(completeProfileSetup, {});
  const errors = state.fieldErrors ?? {};
  // Controlled so a failed submit (which resets the form) keeps the choices
  const [colorId, setColorId] = useState(profile.favoriteColorId ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [preview, setPreview] = useState<string | null>(null);

  // The reset also empties the file input, so drop its preview with it
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    setPreview(null);
  }

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const color = colors.find((c) => c.id === colorId);

  return (
    <form action={action} className="flex flex-col gap-5">
      {state.error && <Alert tone="danger">{state.error}</Alert>}

      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <Avatar name={profile.name} src={preview ?? profile.image} color={color?.hex} size="xl" />
        <Field
          label="Foto"
          htmlFor="avatar"
          hint="Se recorta en cuadrado. Sin foto se muestran tus iniciales."
          error={errors.avatar}
          className="w-full flex-1"
        >
          <Input
            id="avatar"
            type="file"
            name="avatar"
            accept="image/*"
            aria-invalid={!!errors.avatar}
            onChange={(e) => {
              const file = e.target.files?.[0];
              setPreview(file ? URL.createObjectURL(file) : null);
            }}
            className="h-auto py-1.5 file:mr-3 file:border-0 file:bg-border file:px-3 file:py-1 file:text-sm file:font-semibold"
          />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 font-display text-xs font-bold uppercase tracking-wider text-fg-muted">
          Color favorito
        </legend>
        <div className="flex flex-wrap gap-2.5">
          <label title="Sin preferencia" className={cn(swatchClass, "border border-dashed border-border-strong text-fg-subtle")}>
            <input
              type="radio"
              name="favoriteColorId"
              value=""
              checked={colorId === ""}
              onChange={() => setColorId("")}
              className="sr-only"
            />
            <Ban className="size-4" aria-hidden />
            <span className="sr-only">Sin preferencia</span>
          </label>
          {colors.map((c) => (
            <label key={c.id} title={c.name} className={cn(swatchClass, needsOutline(c.hex) && "border border-border-strong")}
              style={{ backgroundColor: c.hex }}>
              <input
                type="radio"
                name="favoriteColorId"
                value={c.id}
                checked={colorId === c.id}
                onChange={() => setColorId(c.id)}
                className="sr-only"
              />
              <span className="sr-only">{c.name}</span>
            </label>
          ))}
        </div>
        {errors.favoriteColorId ? (
          <p className="text-xs text-danger" role="alert">
            {errors.favoriteColorId}
          </p>
        ) : (
          <p className="text-xs text-fg-subtle">
            {color ? `${color.name}. ` : ""}Tiñe tu avatar y tu franja en las gráficas.
          </p>
        )}
      </fieldset>

      <Field label="Sobre ti" htmlFor="bio" error={errors.bio}>
        <Textarea
          id="bio"
          name="bio"
          maxLength={300}
          placeholder="Estilo de conducción, circuito favorito, rivalidades…"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          aria-invalid={!!errors.bio}
        />
      </Field>

      <div className="mt-2 flex flex-col gap-2">
        <SubmitButton fullWidth size="lg">
          Guardar y empezar
        </SubmitButton>
        <ButtonLink href="/" variant="ghost" fullWidth>
          Ahora no
        </ButtonLink>
      </div>
    </form>
  );
}
