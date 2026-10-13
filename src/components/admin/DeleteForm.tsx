import { Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/ui";

type DeleteFormProps = {
  action: () => Promise<void>;
  /** e.g. "¿Eliminar la carrera?" */
  title: string;
  description?: string;
  label?: string;
};

/** Delete button with a confirmation dialog. */
export function DeleteForm({ action, title, description, label = "Eliminar" }: DeleteFormProps) {
  return (
    <form action={action}>
      <ConfirmButton title={title} description={description} confirmLabel="Eliminar" size="sm">
        <Trash2 /> {label}
      </ConfirmButton>
    </form>
  );
}
