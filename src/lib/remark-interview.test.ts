import { describe, expect, it } from "vitest";
import remarkParse from "remark-parse";
import { unified } from "unified";
import type { Root } from "mdast";
import { remarkInterview } from "./remark-interview";

function parse(markdown: string) {
  const processor = unified().use(remarkParse).use(remarkInterview);
  return processor.runSync(processor.parse(markdown)) as Root;
}

/** Each top-level node's marks, with an exchange as the list of its questions' and answers' marks */
const marks = (tree: Root): unknown[] =>
  tree.children.map((node) =>
    node.data?.hProperties?.dataInterview === "exchange" && "children" in node
      ? node.children.map((child) => child.data?.hProperties ?? null)
      : (node.data?.hProperties ?? null),
  );
const firstText = (tree: Root, index: number) => JSON.stringify(tree.children[index]).match(/"value":"([^"]*)"/)?.[1];

describe("remarkInterview", () => {
  it("marks questions, answers and who answers, leaving comments alone", () => {
    const tree = parse("P: ¿Quién gana?\n\nR @Ana: Yo, claro.\n\nUn comentario.\n\nA: Sin nombre.");
    expect(marks(tree)).toEqual([[{ dataInterview: "question" }, { dataInterview: "answer", dataSpeaker: "ana" }], null, [{ dataInterview: "answer" }]]);
    expect(firstText(tree, 0)).toBe("¿Quién gana?");
  });

  it("takes a quote starting with an answer as one answer of several paragraphs", () => {
    const tree = parse("> R @hermilton: Primero.\n>\n> *[Se va]*");
    expect(marks(tree)).toEqual([[{ dataInterview: "answer", dataSpeaker: "hermilton" }]]);
    expect(firstText(tree, 0)).toBe("Primero.");
  });

  it("ignores lower-case markers, markers mid-paragraph and plain quotes", () => {
    expect(marks(parse("p: no\n\nTexto. P: no\n\n> Una cita"))).toEqual([null, null, null]);
  });

  it("leaves a marker that starts with bold text alone", () => {
    expect(marks(parse("**P:** no"))).toEqual([null]);
  });
});
