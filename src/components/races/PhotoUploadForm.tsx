"use client";

import { useActionState } from "react";
import { ImagePlus } from "lucide-react";
import type { FormAction, FormState } from "@/lib/forms";
import { Alert, Input, SubmitButton } from "@/components/ui";

/** Upload one or more photos with an optional shared caption. */
export function PhotoUploadForm({ action }: { action: FormAction }) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="file"
          name="photos"
          accept="image/*"
          multiple
          required
          aria-label="Fotos"
          className="file:mr-3 file:border-0 file:bg-border file:px-3 file:py-1 file:text-sm file:font-semibold sm:flex-1 h-auto py-1.5"
        />
        <Input name="caption" placeholder="Pie de foto (opcional)" maxLength={200} className="sm:flex-1" />
        <SubmitButton variant="secondary">
          <ImagePlus /> Subir
        </SubmitButton>
      </div>
    </form>
  );
}
