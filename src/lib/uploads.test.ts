import path from "node:path";
import { describe, expect, it } from "vitest";
import { largeAvatar, largeAvatarUrl } from "./avatars";
import { photoUrls, resolveUpload, UPLOAD_DIR } from "./uploads";

describe("resolveUpload", () => {
  it("resolves paths inside the upload directory", () => {
    expect(resolveUpload("races/abc/photo.webp")).toBe(path.join(UPLOAD_DIR, "races/abc/photo.webp"));
  });

  it("rejects paths that escape it", () => {
    expect(resolveUpload("../.env")).toBeNull();
    expect(resolveUpload("races/../../heat.db")).toBeNull();
    expect(resolveUpload("/etc/passwd")).toBeNull();
    expect(resolveUpload("")).toBeNull();
  });
});

describe("photoUrls", () => {
  it("builds full and thumbnail URLs", () => {
    expect(photoUrls("races/abc/x.webp")).toEqual({
      full: "/media/races/abc/x.webp",
      thumb: "/media/races/abc/x-thumb.webp",
    });
  });
});

describe("largeAvatar", () => {
  it("names the large version next to the avatar", () => {
    expect(largeAvatar("/media/users/abc/x.webp")).toBe("/media/users/abc/x-full.webp");
    expect(largeAvatar("users/abc/x.webp")).toBe("users/abc/x-full.webp");
  });
});

describe("largeAvatarUrl", () => {
  it("only names one for avatars we stored", () => {
    expect(largeAvatarUrl("/media/users/abc/x.webp")).toBe("/media/users/abc/x-full.webp");
    expect(largeAvatarUrl("https://example.com/x.webp")).toBeNull();
    expect(largeAvatarUrl(null)).toBeNull();
  });
});
