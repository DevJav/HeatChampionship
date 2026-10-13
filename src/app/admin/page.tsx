import type { Metadata } from "next";
import { Suspense } from "react";
import { Lock, LockOpen } from "lucide-react";
import { updateRegistrationOpen } from "@/actions/admin";
import {
  Avatar,
  Badge,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  Container,
  PageHeader,
  Section,
  Skeleton,
  SubmitButton,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@/components/ui";
import { formatDate } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { getSettings } from "@/lib/data/settings";
import { listUsers } from "@/lib/data/users";

export const metadata: Metadata = { title: "Administración" };

async function RegistrationSettings() {
  const { registrationOpen } = await getSettings();

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Registro de pilotos</CardTitle>
          <CardDescription>Controla si se pueden crear cuentas nuevas.</CardDescription>
        </div>
        <Badge tone={registrationOpen ? "success" : "danger"}>
          {registrationOpen ? "Abierto" : "Cerrado"}
        </Badge>
      </CardHeader>
      <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-fg-muted">
          {registrationOpen
            ? "Cualquiera con el enlace puede registrarse. Ciérralo cuando estén todos tus amigos."
            : "Nadie puede registrarse. Ábrelo para que se unan nuevos pilotos."}
        </p>
        <form action={updateRegistrationOpen}>
          <input type="hidden" name="open" value={String(!registrationOpen)} />
          <SubmitButton variant={registrationOpen ? "secondary" : "primary"}>
            {registrationOpen ? <Lock /> : <LockOpen />}
            {registrationOpen ? "Cerrar registro" : "Abrir registro"}
          </SubmitButton>
        </form>
      </CardBody>
    </Card>
  );
}

async function PlayersTable() {
  const users = await listUsers();

  return (
    <Card>
      <Table>
        <THead>
          <tr>
            <Th>Piloto</Th>
            <Th>Usuario</Th>
            <Th>Rol</Th>
            <Th align="right">Alta</Th>
          </tr>
        </THead>
        <TBody>
          {users.map((user) => (
            <Tr key={user.id}>
              <Td>
                <span className="flex items-center gap-2 font-semibold">
                  <Avatar name={user.name} src={user.image} size="sm" />
                  {user.name}
                </span>
              </Td>
              <Td className="text-fg-muted">@{user.username}</Td>
              <Td>
                {user.role === "admin" ? (
                  <Badge tone="primary">Admin</Badge>
                ) : (
                  <Badge>Piloto</Badge>
                )}
              </Td>
              <Td align="right" className="text-fg-muted">
                {formatDate(user.createdAt)}
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    </Card>
  );
}

async function AdminDashboard() {
  await requireAdmin("/admin");

  return (
    <div className="flex flex-col gap-10">
      <RegistrationSettings />
      <Section title="Pilotos registrados">
        <PlayersTable />
      </Section>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Container>
      <PageHeader
        eyebrow="Organizador"
        title="Administración"
        description="Temporadas, carreras, resultados y pilotos."
      />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <AdminDashboard />
      </Suspense>
    </Container>
  );
}
