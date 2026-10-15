"use client"; // Replaces the root layout when it fails, so it brings its own document and styles

import { locale, t } from "@/i18n";
import "./globals.css";

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang={locale}>
      <body className="flex min-h-screen items-center justify-center bg-background p-6 text-fg">
        <title>{t.errors.errorHeading}</title>
        <div className="flex max-w-md flex-col items-start gap-4 border-l-4 border-primary surface-bar p-8">
          <h1 className="text-4xl">{t.errors.errorHeading}</h1>
          <p className="opacity-80">{t.errors.globalErrorDescription}</p>
          <button
            type="button"
            onClick={() => retry()}
            className="bg-primary px-5 py-2 font-bold uppercase italic text-primary-fg"
          >
            {t.errors.retry}
          </button>
          {error.digest && <p className="text-xs opacity-50">{t.errors.reference(error.digest)}</p>}
        </div>
      </body>
    </html>
  );
}
