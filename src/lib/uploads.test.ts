import path from "node:path";
import { describe, expect, it } from "vitest";
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
