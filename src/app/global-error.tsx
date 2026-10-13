"use client"; // Replaces the root layout when it fails, so it brings its own document and styles

import "./globals.css";

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="es">
      <body className="flex min-h-screen items-center justify-center bg-background p-6 text-fg">
        <title>Bandera roja</title>
        <div className="flex max-w-md flex-col items-start gap-4 border-l-4 border-primary surface-bar p-8">
          <h1 className="text-4xl">Bandera roja</h1>
          <p className="opacity-80">Algo ha fallado al cargar la web. Prueba otra vez en un momento.</p>
          <button
            type="button"
            onClick={() => retry()}
            className="bg-primary px-5 py-2 font-bold uppercase italic text-primary-fg"
          >
            Reintentar
          </button>
          {error.digest && <p className="text-xs opacity-50">Referencia: {error.digest}</p>}
        </div>
      </body>
    </html>
  );
}
