import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { deleteUser, renameUser, resetUserPassword, setUserRole } from "@/actions/users";
import { Avatar, Badge, Card, CardBody, CardDescription, CardHeader, CardTitle, SubmitButton } from "@/components/ui";
import { AdminSuspense } from "@/components/admin/AdminSuspense";
import { DeleteForm } from "@/components/admin/DeleteForm";
import { UserNameForm, UserPasswordForm } from "@/components/admin/UserForms";
import { getAdminUser } from "@/lib/data/users";
import { formatDate, plural } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Editar piloto · Admin" };

async function AdminPlayerPageContent({ params }: PageProps<"/admin/pilotos/[id]">) {
  const { id } = await params;
  const admin = await requireAdmin(`/admin/pilotos/${id}`);
  const user = await getAdminUser(id);
  if (!user) notFound();
  const isSelf = user.id === admin.id;
  const isAdmin = user.role === "admin";

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <span className="flex items-center gap-3">
            <Avatar name={user.name} src={user.image} />
            <span>
              <CardTitle>{user.name}</CardTitle>
              <CardDescription>
                @{user.username} · alta el {formatDate(user.createdAt)}
              </CardDescription>
            </span>
          </span>
          {isAdmin ? <Badge tone="primary">Admin</Badge> : <Badge tone="bar">Piloto</Badge>}
        </CardHeader>
        <CardBody className="flex flex-col gap-2 text-sm text-fg-muted">
          <p>
            {plural(user._count.results, "carrera con resultado", "carreras con resultado")} ·{" "}
            {plural(user._count.registrations, "inscripción", "inscripciones")} ·{" "}
            {plural(user._count.sessions, "sesión abierta", "sesiones abiertas")}
          </p>
          {user.username && (
            <Link href={`/pilotos/${user.username}`} className="font-semibold text-fg hover:text-primary hover:underline">
              Ver perfil público
            </Link>
          )}
        </CardBody>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Nombre</CardTitle>
          </CardHeader>
          <CardBody>
            <UserNameForm action={renameUser.bind(null, user.id)} name={user.name} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Contraseña</CardTitle>
              <CardDescription>Para quien la haya olvidado.</CardDescription>
            </div>
          </CardHeader>
          <CardBody>
            <UserPasswordForm action={resetUserPassword.bind(null, user.id)} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Rol</CardTitle>
              <CardDescription>Los administradores gestionan carreras, resultados y pilotos.</CardDescription>
            </div>
          </CardHeader>
          <CardBody>
            {isSelf ? (
              <p className="text-sm text-fg-muted">No puedes quitarte el rol de administrador a ti mismo.</p>
            ) : (
              <form action={setUserRole.bind(null, user.id)}>
                <input type="hidden" name="role" value={isAdmin ? "user" : "admin"} />
                <SubmitButton variant={isAdmin ? "secondary" : "primary"}>
                  {isAdmin ? <ShieldOff /> : <ShieldCheck />}
                  {isAdmin ? "Quitar administrador" : "Hacer administrador"}
                </SubmitButton>
              </form>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Eliminar cuenta</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col items-start gap-3 text-sm text-fg-muted">
            {isSelf ? (
              <p>No puedes eliminar tu propia cuenta.</p>
            ) : user._count.results > 0 ? (
              <p>
                Tiene resultados en {plural(user._count.results, "carrera", "carreras")}: eliminarle cambiaría clasificaciones pasadas, así que no
                se puede.
              </p>
            ) : (
              <>
                <p>Borra la cuenta y sus inscripciones. No tiene resultados, así que las clasificaciones no cambian.</p>
                <DeleteForm
                  action={deleteUser.bind(null, user.id)}
                  title={`¿Eliminar a ${user.name}?`}
                  description="No se puede deshacer."
                  label="Eliminar cuenta"
                />
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

export default function AdminPlayerPage(props: PageProps<"/admin/pilotos/[id]">) {
  return (
    <AdminSuspense>
      <AdminPlayerPageContent {...props} />
    </AdminSuspense>
  );
}
