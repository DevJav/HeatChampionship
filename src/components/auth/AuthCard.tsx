import { Card, CardBody, CardDescription, CardHeader, CardTitle, Container } from "@/components/ui";

type AuthCardProps = {
  title: string;
  description?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

/** Narrow centered card shared by the login, sign-up and welcome pages. */
export function AuthCard({ title, description, footer, children }: AuthCardProps) {
  return (
    <Container className="flex max-w-md flex-col gap-4">
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="text-2xl">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
        </CardHeader>
        <CardBody className="py-6">{children}</CardBody>
      </Card>
      {footer && <p className="text-center text-sm text-fg-muted">{footer}</p>}
    </Container>
  );
}
