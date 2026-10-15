import type { Metadata } from "next";
import { Suspense } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { removeAvatar } from "@/actions/profile";
import {
  Avatar,
  ButtonLink,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  Container,
  PageHeader,
  Skeleton,
  SubmitButton,
} from "@/components/ui";
import { AvatarForm } from "@/components/players/AvatarForm";
import { EmailPreferencesForm } from "@/components/players/EmailPreferencesForm";
import { PasswordForm } from "@/components/players/PasswordForm";
import { ProfileForm } from "@/components/players/ProfileForm";
import { listCarColors } from "@/lib/data/catalog";
import { getEditableProfile } from "@/lib/data/players";
import { emailEnabled } from "@/lib/email/send";
import { requireUser } from "@/lib/session";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.profile.title };

async function ProfileSettings() {
  const user = await requireUser("/perfil");
  const [profile, colors] = await Promise.all([getEditableProfile(user.id), listCarColors()]);
  const activeColors = colors.filter((c) => c.active || c.id === profile.favoriteColorId);
  const favorite = colors.find((c) => c.id === profile.favoriteColorId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <ButtonLink href={`/pilotos/${profile.username}`} variant="secondary" size="sm">
          <ExternalLink /> {t.profile.viewPublic}
        </ButtonLink>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.profile.details}</CardTitle>
        </CardHeader>
        <CardBody>
          <ProfileForm profile={profile} colors={activeColors} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{t.profile.photo}</CardTitle>
            <CardDescription>{t.profile.photoHint}</CardDescription>
          </div>
        </CardHeader>
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar name={profile.name} src={profile.image} color={favorite?.hex} size="xl" />
          <div className="flex flex-1 flex-col gap-3">
            <AvatarForm />
            {profile.image && (
              <form action={removeAvatar}>
                <SubmitButton variant="ghost" size="sm">
                  <Trash2 /> {t.profile.removePhoto}
                </SubmitButton>
              </form>
            )}
          </div>
        </CardBody>
      </Card>

      {emailEnabled() && (
        <Card id="correo" className="scroll-mt-24">
          <CardHeader>
            <div>
              <CardTitle>{t.email.title}</CardTitle>
              <CardDescription>{t.email.hint}</CardDescription>
            </div>
          </CardHeader>
          <CardBody>
            <EmailPreferencesForm profile={profile} />
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{t.profile.password}</CardTitle>
            <CardDescription>{t.profile.passwordHint}</CardDescription>
          </div>
        </CardHeader>
        <CardBody>
          <PasswordForm />
        </CardBody>
      </Card>
    </div>
  );
}

export default function ProfileSettingsPage() {
  return (
    <Container className="max-w-3xl">
      <PageHeader title={t.profile.title} description={t.profile.description} />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ProfileSettings />
      </Suspense>
    </Container>
  );
}
