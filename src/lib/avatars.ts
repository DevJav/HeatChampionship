/** Path or URL of an avatar's large version, opened by clicking it. Avatars stored before it existed have none. */
export function largeAvatar(pathOrUrl: string) {
  return pathOrUrl.replace(/\.webp$/, "-full.webp");
}

/** URL of the large version of an avatar we stored, or null for one we didn't (no upload, or an outside URL). */
export function largeAvatarUrl(url: string | null | undefined) {
  return url?.startsWith("/media/") ? largeAvatar(url) : null;
}
