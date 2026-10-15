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
import { formatDate } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.admin.pageTitle(t.admin.users.edit) };

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
            <Avatar name={user.name} src={user.image} color={user.favoriteColor?.hex} />
            <span>
              <CardTitle>{user.name}</CardTitle>
              <CardDescription>
                @{user.username} · {t.admin.users.joinedOn(formatDate(user.createdAt))}
              </CardDescription>
            </span>
          </span>
          {isAdmin ? <Badge tone="primary">{t.admin.users.admin}</Badge> : <Badge tone="bar">{t.admin.users.driver}</Badge>}
        </CardHeader>
        <CardBody className="flex flex-col gap-2 text-sm text-fg-muted">
          <p>
            {t.admin.users.resultsCount(user._count.results)} · {t.admin.users.registrationsCount(user._count.registrations)} ·{" "}
            {t.admin.users.sessionsCount(user._count.sessions)}
          </p>
          {user.username && (
            <Link href={`/pilotos/${user.username}`} className="font-semibold text-fg hover:text-primary hover:underline">
              {t.admin.users.viewPublic}
            </Link>
          )}
        </CardBody>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.admin.users.name}</CardTitle>
          </CardHeader>
          <CardBody>
            <UserNameForm action={renameUser.bind(null, user.id)} name={user.name} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>{t.admin.users.password}</CardTitle>
              <CardDescription>{t.admin.users.passwordDescription}</CardDescription>
            </div>
          </CardHeader>
          <CardBody>
            <UserPasswordForm action={resetUserPassword.bind(null, user.id)} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>{t.admin.users.role_}</CardTitle>
              <CardDescription>{t.admin.users.roleDescription}</CardDescription>
            </div>
          </CardHeader>
          <CardBody>
            {isSelf ? (
              <p className="text-sm text-fg-muted">{t.admin.users.cantDemoteSelf}</p>
            ) : (
              <form action={setUserRole.bind(null, user.id)}>
                <input type="hidden" name="role" value={isAdmin ? "user" : "admin"} />
                <SubmitButton variant={isAdmin ? "secondary" : "primary"}>
                  {isAdmin ? <ShieldOff /> : <ShieldCheck />}
                  {isAdmin ? t.admin.users.removeAdmin : t.admin.users.makeAdmin}
                </SubmitButton>
              </form>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.admin.users.deleteAccount}</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col items-start gap-3 text-sm text-fg-muted">
            {isSelf ? (
              <p>{t.admin.users.cantDeleteSelf}</p>
            ) : user._count.results > 0 ? (
              <p>{t.admin.users.hasResults(t.common.races(user._count.results))}</p>
            ) : (
              <>
                <p>{t.admin.users.deleteDescription}</p>
                <DeleteForm
                  action={deleteUser.bind(null, user.id)}
                  title={t.admin.users.deleteTitle(user.name)}
                  description={t.admin.users.cantUndo}
                  label={t.admin.users.deleteAccount}
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
