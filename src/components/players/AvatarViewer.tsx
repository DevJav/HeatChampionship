"use client";

import { useState } from "react";
import { Avatar, Modal } from "@/components/ui";
import { largeAvatarUrl } from "@/lib/avatars";
import { cn } from "@/lib/cn";
import { t } from "@/i18n";

type AvatarViewerProps = Omit<React.ComponentProps<typeof Avatar>, "src"> & {
  src: string | null;
};

/** An avatar that opens the photo up when clicked. The default helmet has nothing to open. */
export function AvatarViewer({ name, src, className, ...avatarProps }: AvatarViewerProps) {
  const [open, setOpen] = useState(false);
  // Avatars stored before there was a large version only have the small one
  const [largeMissing, setLargeMissing] = useState(false);
  const large = largeAvatarUrl(src);

  if (!src) return <Avatar name={name} className={className} {...avatarProps} />;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.drivers.openPhoto(name)}
        className={cn(
          "h-fit w-fit shrink-0 cursor-zoom-in rounded-control transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          className,
        )}
      >
        <Avatar name={name} src={src} {...avatarProps} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={name}>
        {open && (
          // eslint-disable-next-line @next/next/no-img-element -- user uploads, served locally
          <img
            src={large && !largeMissing ? large : src}
            alt={name}
            onError={() => setLargeMissing(true)}
            className="aspect-square w-full bg-surface-2 object-cover"
          />
        )}
      </Modal>
    </>
  );
}
