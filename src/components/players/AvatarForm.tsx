"use client";

import { useActionState } from "react";
import { ImagePlus } from "lucide-react";
import { uploadAvatar } from "@/actions/profile";
import { Alert, Input, SubmitButton } from "@/components/ui";

/** Upload a new profile picture (cropped to a square on the server). */
export function AvatarForm() {
  const [state, action] = useActionState(uploadAvatar, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="file"
          name="avatar"
          accept="image/*"
          required
          aria-label="Foto de perfil"
          className="h-auto py-1.5 file:mr-3 file:border-0 file:bg-border file:px-3 file:py-1 file:text-sm file:font-semibold sm:flex-1"
        />
        <SubmitButton variant="secondary">
          <ImagePlus /> Subir foto
        </SubmitButton>
      </div>
    </form>
  );
}
