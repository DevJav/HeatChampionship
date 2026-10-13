import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * Uploaded photos live on disk next to the database (data/uploads by default)
 * and are served by app/media/[...path]/route.ts. Back up data/ to keep both.
 */
export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? path.join(process.cwd(), "data", "uploads"));

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const MAX_FILES_PER_UPLOAD = 10;

/** Absolute path for a stored file, or null if it would escape UPLOAD_DIR. */
export function resolveUpload(relativePath: string) {
  const absolute = path.resolve(UPLOAD_DIR, relativePath);
  return absolute.startsWith(UPLOAD_DIR + path.sep) ? absolute : null;
}

/** Public URLs for a stored photo and its thumbnail. */
export function photoUrls(storedPath: string) {
  return {
    full: `/media/${storedPath}`,
    thumb: `/media/${storedPath.replace(/\.webp$/, "-thumb.webp")}`,
  };
}

export class UploadError extends Error {}

/**
 * Store an uploaded image as WebP (max 2000px) plus a 600px thumbnail.
 * Returns the stored path relative to UPLOAD_DIR.
 */
export async function storeRacePhoto(raceId: string, file: File) {
  if (!file.type.startsWith("image/")) throw new UploadError(`"${file.name}" no es una imagen.`);
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError(`"${file.name}" pesa más de 15 MB.`);

  const input = Buffer.from(await file.arrayBuffer());
  const storedPath = path.posix.join("races", raceId, `${randomUUID()}.webp`);
  const absolute = resolveUpload(storedPath);
  if (!absolute) throw new UploadError("Ruta no válida.");
  await mkdir(path.dirname(absolute), { recursive: true });

  try {
    // rotate() applies the phone's EXIF orientation before metadata is dropped
    const image = sharp(input).rotate();
    const [full, thumb] = await Promise.all([
      image.clone().resize(2000, 2000, { fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer(),
      image.clone().resize(600, 600, { fit: "cover" }).webp({ quality: 75 }).toBuffer(),
    ]);
    await writeFile(absolute, full);
    await writeFile(absolute.replace(/\.webp$/, "-thumb.webp"), thumb);
  } catch {
    throw new UploadError(`No se pudo procesar "${file.name}".`);
  }

  return storedPath;
}

export async function deleteStoredPhoto(storedPath: string) {
  for (const variant of [storedPath, storedPath.replace(/\.webp$/, "-thumb.webp")]) {
    const absolute = resolveUpload(variant);
    if (absolute) await rm(absolute, { force: true });
  }
}
