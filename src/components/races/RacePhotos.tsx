import Link from "next/link";
import { Camera, X } from "lucide-react";
import { deleteRacePhoto, uploadRacePhotos } from "@/actions/photos";
import { getRacePhotos } from "@/lib/data/results";
import { getCurrentUser, isAdmin } from "@/lib/session";
import { photoUrls } from "@/lib/uploads";
import { Button, EmptyState } from "@/components/ui";
import { PhotoUploadForm } from "./PhotoUploadForm";
import { t } from "@/i18n";

type RacePhotosProps = {
  raceId: string;
  /** User ids of the race's drivers (they may upload) */
  driverIds: string[];
};

/** Photo grid with upload for the race's drivers. Reads DB + session: render inside <Suspense>. */
export async function RacePhotos({ raceId, driverIds }: RacePhotosProps) {
  const [photos, user] = await Promise.all([getRacePhotos(raceId), getCurrentUser()]);
  const admin = isAdmin(user);
  const canUpload = !!user && (admin || driverIds.includes(user.id));

  return (
    <div className="flex flex-col gap-4">
      {photos.length === 0 ? (
        <EmptyState
          icon={<Camera />}
          title={t.races.photoList.empty}
          description={canUpload ? t.races.photoList.emptyCanUpload : undefined}
          className="py-8"
        />
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => {
            const urls = photoUrls(photo.path);
            const canDelete = admin || photo.uploadedById === user?.id;
            return (
              <li key={photo.id} className="group relative">
                <a href={urls.full} target="_blank" rel="noreferrer" className="block overflow-hidden bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- already resized on upload */}
                  <img
                    src={urls.thumb}
                    alt={photo.caption ?? t.races.photoList.alt}
                    loading="lazy"
                    className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                  />
                </a>
                {photo.caption && <p className="mt-1 text-sm break-words">{photo.caption}</p>}
                {photo.uploadedBy && (
                  <p className="mt-0.5 truncate text-xs text-fg-muted">
                    {t.races.photoList.uploadedBy}{" "}
                    {photo.uploadedBy.username ? (
                      <Link href={`/pilotos/${photo.uploadedBy.username}`} className="font-semibold hover:text-primary hover:underline">
                        {photo.uploadedBy.name}
                      </Link>
                    ) : (
                      <span className="font-semibold">{photo.uploadedBy.name}</span>
                    )}
                  </p>
                )}
                {canDelete && (
                  <form action={deleteRacePhoto.bind(null, photo.id)} className="absolute top-1 right-1">
                    <Button type="submit" size="icon" variant="danger" aria-label={t.races.photoList.delete} className="size-7">
                      <X />
                    </Button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {canUpload && <PhotoUploadForm action={uploadRacePhotos.bind(null, raceId)} />}
    </div>
  );
}
