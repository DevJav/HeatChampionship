import { Mail } from "lucide-react";
import { dismissEmailPrompt, openEmailSettings } from "@/actions/email";
import { Alert, Container, SubmitButton } from "@/components/ui";
import { shouldPromptForEmail } from "@/lib/data/users";
import { emailEnabled } from "@/lib/email/send";
import { getCurrentUser } from "@/lib/session";
import { t } from "@/i18n";

/**
 * Asks logged-in drivers without an address, once, whether they want emails.
 * Gone for good after either button, or once they add an address.
 */
export async function EmailPrompt() {
  if (!emailEnabled()) return null;
  const user = await getCurrentUser();
  if (!user || !(await shouldPromptForEmail(user.id))) return null;

  return (
    <Container className="pt-6">
      <Alert icon={<Mail />}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">{t.email.promptTitle}</p>
            <p className="text-fg-muted">{t.email.promptBody}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <form action={dismissEmailPrompt}>
              <SubmitButton variant="ghost" size="sm">
                {t.email.promptDismiss}
              </SubmitButton>
            </form>
            <form action={openEmailSettings}>
              <SubmitButton size="sm">{t.email.promptAdd}</SubmitButton>
            </form>
          </div>
        </div>
      </Alert>
    </Container>
  );
}
