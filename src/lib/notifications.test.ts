import { describe, expect, it } from "vitest";
import { describeNotification, type NotificationRecord } from "./notifications";
import { referencedUsernames } from "./articles";
import { formatRelative } from "./format";

const base: NotificationRecord = {
  type: "ARTICLE_MENTION",
  actor: { name: "Javier" },
  article: { slug: "previa-italia", title: "Previa Italia" },
  commentId: null,
  race: null,
};

describe("describeNotification", () => {
  it("links mentions to the article", () => {
    expect(describeNotification(base)).toEqual({
      message: "Javier te ha mencionado en «Previa Italia»",
      href: "/noticias/previa-italia",
    });
  });

  it("links comment notifications to the comment", () => {
    const reply = describeNotification({ ...base, type: "COMMENT_REPLY", actor: { name: "Ana" }, commentId: "c1" });
    expect(reply).toEqual({
      message: "Ana ha respondido a tu comentario en «Previa Italia»",
      href: "/noticias/previa-italia#comentario-c1",
    });
  });

  it("includes the finishing place for race results", () => {
    const race = { id: "r1", round: 3, track: { name: "Italia" }, results: [{ position: 2, points: 6 }] };
    expect(describeNotification({ ...base, type: "RACE_RESULTS", actor: null, article: null, race })).toEqual({
      message: "Ya están los resultados de Ronda 3 · Italia: terminaste 2º (6 pts)",
      href: "/carreras/r1",
    });
    const withoutResult = describeNotification({ ...base, type: "RACE_RESULTS", actor: null, race: { ...race, results: [] } });
    expect(withoutResult.message).toBe("Ya están los resultados de Ronda 3 · Italia");
  });

  it("copes with a deleted actor", () => {
    expect(describeNotification({ ...base, actor: null }).message).toBe("Alguien te ha mencionado en «Previa Italia»");
  });
});

describe("referencedUsernames", () => {
  it("combines mentions and driver cards", () => {
    expect(referencedUsernames("Hola @ana\n\n{{piloto:Luis | Luis}}\n\n@ana otra vez")).toEqual(["ana", "luis"]);
  });
});

describe("formatRelative", () => {
  const now = new Date("2026-10-14T12:00:00Z");
  it("uses relative words for recent dates", () => {
    expect(formatRelative(new Date("2026-10-14T11:59:30Z"), now)).toBe("ahora");
    expect(formatRelative(new Date("2026-10-14T11:55:00Z"), now)).toBe("hace 5 minutos");
    expect(formatRelative(new Date("2026-10-13T12:00:00Z"), now)).toBe("ayer");
  });

  it("falls back to a date after a week", () => {
    expect(formatRelative(new Date("2026-09-01T12:00:00Z"), now)).toBe("1 sept");
  });
});
