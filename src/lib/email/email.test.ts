import { describe, expect, it } from "vitest";
import { renderEmail } from "./template";
import { parseTopics, serializeTopics, topicNames } from "./topics";

describe("email topics", () => {
  it("round-trips and drops unknown topics", () => {
    expect(parseTopics("races,gone,news")).toEqual(["races", "news"]);
    expect(parseTopics("")).toEqual([]);
    expect(serializeTopics(["races", "news"])).toBe("races,news");
  });

  it("names the topics as a list", () => {
    expect(topicNames(["races", "results", "news"])).toBe("carreras, resultados y noticias");
  });
});

describe("renderEmail", () => {
  const content = {
    subject: "Hola",
    heading: "Ronda 1 <Mónaco>",
    paragraphs: ["Uno & dos"],
    button: { label: "Ver", url: "https://heat.example.com/carreras/1?a=1&b=2" },
  };
  const footer = { reason: "Porque sí.", links: [{ label: "Baja", url: "https://heat.example.com/correo/baja?token=x" }] };

  it("escapes what goes into the HTML", () => {
    const { html } = renderEmail("Heat", content, footer);
    expect(html).toContain("Ronda 1 &#60;Mónaco&#62;");
    expect(html).toContain("Uno &#38; dos");
    expect(html).toContain('href="https://heat.example.com/carreras/1?a=1&#38;b=2"');
  });

  it("has a plain-text version with every link", () => {
    const { text } = renderEmail("Heat", content, footer);
    expect(text).toContain("Ver: https://heat.example.com/carreras/1?a=1&b=2");
    expect(text).toContain("Baja: https://heat.example.com/correo/baja?token=x");
  });
});
