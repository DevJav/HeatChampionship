"use client";

import { useState } from "react";
import { Check, Link2, MessageCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui";
import { t } from "@/i18n";

type ShareButtonsProps = {
  /** wa.me link with the message ready */
  whatsappHref: string;
  /** Absolute page URL for "copy link" */
  url: string;
  variant?: "inverse" | "secondary";
};

/** Share a race: WhatsApp with a ready-made message, or copy the link. */
export function ShareButtons({ whatsappHref, url, variant = "inverse" }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (e.g. plain http): let the browser show the URL to copy by hand
      window.prompt(t.races.share.copyPrompt, url);
    }
  }

  return (
    <>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({ variant, size: "sm" })}
      >
        <MessageCircle /> WhatsApp
      </a>
      <Button type="button" onClick={copy} variant={variant} size="sm" aria-live="polite">
        {copied ? <Check /> : <Link2 />} {copied ? t.races.share.copied : t.races.share.copy}
      </Button>
    </>
  );
}
