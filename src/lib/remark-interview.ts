import type { Blockquote, Paragraph, Root, RootContent } from "mdast";

/**
 * Interview format for articles:
 *
 * - `P: …` (or `Q: …`) is a question.
 * - `R @username: …` (or `A @username: …`) is that driver's answer; the
 *   username is optional. An answer of several paragraphs goes in a quote
 *   (`> R @username: …`), and the whole quote becomes the answer.
 *
 * Everything else stays as it is, so the writer's own comments go between them.
 * Questions and answers in a row are grouped into one exchange.
 */

/** The letter must be upper case (see ROLE), so an ordinary sentence starting with "a:" is left alone */
const MARKER = /^(P|Q|R|A)(?:\s+@([a-z0-9_](?:[a-z0-9_.]*[a-z0-9_])?))?\s*:\s*/i;
const ROLE: Record<string, "question" | "answer"> = { P: "question", Q: "question", R: "answer", A: "answer" };

/** Removes the marker at the start of a paragraph and says what it was, or null when there's none. */
function takeMarker(paragraph: Paragraph) {
  const first = paragraph.children[0];
  if (first?.type !== "text") return null;
  const match = MARKER.exec(first.value);
  const role = match && ROLE[match[1]];
  if (!match || !role) return null;
  first.value = first.value.slice(match[0].length);
  if (first.value === "") paragraph.children.shift();
  return { role, speaker: role === "answer" && match[2] ? match[2].toLowerCase() : null };
}

/** Becomes data-interview / data-speaker attributes that the renderer turns into question and answer blocks. */
function mark(node: Paragraph | Blockquote, { role, speaker }: { role: string; speaker: string | null }) {
  node.data = { ...node.data, hProperties: { ...node.data?.hProperties, dataInterview: role, ...(speaker && { dataSpeaker: speaker }) } };
}

/** Marks the node when it starts with a marker; says whether it did. */
function markInterview(node: RootContent) {
  const paragraph = node.type === "paragraph" ? node : node.type === "blockquote" && node.children[0]?.type === "paragraph" ? node.children[0] : null;
  const marker = paragraph && takeMarker(paragraph);
  if (marker) mark(node as Paragraph | Blockquote, marker);
  return marker != null;
}

/**
 * Remark plugin: marks the questions and answers at the top level of the text
 * and wraps each run of them in an exchange (a div with data-interview="exchange").
 * Run it before the mentions.
 */
export function remarkInterview() {
  return (tree: Root) => {
    const children: RootContent[] = [];
    let exchange: Blockquote | null = null;
    for (const node of tree.children) {
      if (!markInterview(node)) {
        exchange = null;
        children.push(node);
        continue;
      }
      if (!exchange) {
        exchange = { type: "blockquote", children: [], data: { hName: "div", hProperties: { dataInterview: "exchange" } } };
        children.push(exchange);
      }
      exchange.children.push(node as Paragraph | Blockquote);
    }
    tree.children = children;
  };
}
