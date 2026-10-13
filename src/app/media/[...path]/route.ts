import { readFile } from "node:fs/promises";
import { resolveUpload } from "@/lib/uploads";

/** Serves uploaded photos from UPLOAD_DIR. File names are random UUIDs, so they're cached forever. */
export async function GET(_request: Request, { params }: RouteContext<"/media/[...path]">) {
  const { path } = await params;
  const absolute = resolveUpload(path.join("/"));
  if (!absolute || !absolute.endsWith(".webp")) return new Response("Not found", { status: 404 });

  try {
    const file = await readFile(absolute);
    return new Response(file, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
