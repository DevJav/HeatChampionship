import { Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/ui";
import { t } from "@/i18n";

type DeleteFormProps = {
  action: () => Promise<void>;
  /** e.g. "Delete this race?" */
  title: string;
  description?: string;
  label?: string;
};

/** Delete button with a confirmation dialog. */
export function DeleteForm({ action, title, description, label = t.admin.delete }: DeleteFormProps) {
  return (
    <form action={action}>
      <ConfirmButton title={title} description={description} confirmLabel={t.admin.delete} size="sm">
        <Trash2 /> {label}
      </ConfirmButton>
    </form>
  );
}
