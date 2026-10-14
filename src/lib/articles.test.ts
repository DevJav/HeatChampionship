import { describe, expect, it } from "vitest";
import {
  categoryFromParam,
  embedSnippet,
  filterMentionCandidates,
  mentionedUsernames,
  mentionQueryAt,
  plainExcerpt,
  splitArticle,
} from "./articles";

describe("splitArticle", () => {
  it("splits embed lines out of the Markdown", () => {
    const body = "Intro **bold**\n\n{{resultados:abc123 | Ronda 3 · Italia}}\n\nOutro";
    expect(splitArticle(body)).toEqual([
      { type: "markdown", text: "Intro **bold**\n" },
      { type: "embed", embed: { kind: "resultados", ref: "abc123", source: "{{resultados:abc123 | Ronda 3 · Italia}}" } },
      { type: "markdown", text: "\nOutro" },
    ]);
  });

  it("accepts embeds without a reference or label", () => {
    expect(splitArticle("{{clasificacion}}")).toEqual([
      { type: "embed", embed: { kind: "clasificacion", ref: null, source: "{{clasificacion}}" } },
    ]);
  });

  it("leaves unknown kinds and inline braces as text", () => {
    expect(splitArticle("{{nope:1}}\nsee {{carrera:1}} here")).toEqual([
      { type: "markdown", text: "{{nope:1}}\nsee {{carrera:1}} here" },
    ]);
  });

  it("doesn't parse embeds inside code fences", () => {
    const body = "```\n{{carrera:1}}\n```\n{{carrera:2}}";
    const segments = splitArticle(body);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toEqual({ type: "markdown", text: "```\n{{carrera:1}}\n```" });
    expect(segments[1]).toMatchObject({ type: "embed", embed: { ref: "2" } });
  });

  it("normalizes Windows line endings", () => {
    expect(splitArticle("a\r\n{{podio:x}}\r\nb").map((s) => s.type)).toEqual(["markdown", "embed", "markdown"]);
  });
});

describe("embedSnippet", () => {
  it("round-trips through the parser", () => {
    const snippet = embedSnippet("carrera", "r1", "Ronda 1 · {Italia}");
    expect(snippet).toBe("{{carrera:r1 | Ronda 1 · Italia}}");
    expect(splitArticle(snippet)[0]).toMatchObject({ type: "embed", embed: { kind: "carrera", ref: "r1" } });
  });

  it("omits the reference when there is none", () => {
    expect(embedSnippet("clasificacion")).toBe("{{clasificacion}}");
  });
});

describe("mentionedUsernames", () => {
  it("finds unique, lowercased mentions", () => {
    expect(mentionedUsernames("@Ana ganó a @luis.p y @ana otra vez")).toEqual(["ana", "luis.p"]);
  });

  it("ignores emails and trailing punctuation", () => {
    expect(mentionedUsernames("escribe a foo@bar.com, ¡bien @ana.!")).toEqual(["ana"]);
  });
});

describe("plainExcerpt", () => {
  it("strips Markdown and embeds", () => {
    const body = "## Título\n\nGanó **@ana** en [Italia](/carreras/1).\n\n{{podio:1}}\n\n- Uno";
    expect(plainExcerpt(body)).toBe("Título Ganó @ana en Italia. Uno");
  });

  it("cuts at a word boundary", () => {
    expect(plainExcerpt("una frase bastante larga para cortar", 20)).toBe("una frase bastante…");
  });
});

describe("categoryFromParam", () => {
  it("maps URL params to categories", () => {
    expect(categoryFromParam("cronicas")).toBe("REPORT");
    expect(categoryFromParam("x")).toBeNull();
    expect(categoryFromParam(undefined)).toBeNull();
  });
});

describe("mentionQueryAt", () => {
  it("finds the mention being typed", () => {
    expect(mentionQueryAt("hola @")).toEqual({ start: 5, query: "" });
    expect(mentionQueryAt("hola @Luc")).toEqual({ start: 5, query: "Luc" });
    expect(mentionQueryAt("@ana")).toEqual({ start: 0, query: "ana" });
    expect(mentionQueryAt("(@lucí")).toEqual({ start: 1, query: "lucí" });
  });

  it("ignores emails, finished mentions and plain text", () => {
    expect(mentionQueryAt("foo@bar")).toBeNull();
    expect(mentionQueryAt("@ana ")).toBeNull();
    expect(mentionQueryAt("sin arroba")).toBeNull();
  });
});

describe("filterMentionCandidates", () => {
  const drivers = [
    { name: "Lucía", username: "lucia", color: null },
    { name: "Fernando Alonso", username: "fernandoalonso", color: null },
    { name: "Ana", username: "ana", color: null },
    { name: "Juan", username: "jlucas", color: null },
  ];

  it("returns everyone for an empty query", () => {
    expect(filterMentionCandidates(drivers, "")).toHaveLength(4);
  });

  it("matches names ignoring accents, prefixes first", () => {
    expect(filterMentionCandidates(drivers, "Luc").map((d) => d.username)).toEqual(["lucia", "jlucas"]);
    expect(filterMentionCandidates(drivers, "alonso").map((d) => d.username)).toEqual(["fernandoalonso"]);
    expect(filterMentionCandidates(drivers, "xyz")).toEqual([]);
  });
});
