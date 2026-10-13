import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui";

type EditCardProps = {
  title: string;
  /** Shown in the header, e.g. a delete button */
  actions?: React.ReactNode;
  children: React.ReactNode;
};

/** Card wrapping an admin create/edit form. */
export function EditCard({ title, actions, children }: EditCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {actions}
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
}
