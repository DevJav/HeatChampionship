import type { Link, Parent, PhrasingContent, Root, Text } from "mdast";
import { MENTION_PATTERN } from "./articles";

/** Text split around the mentions of known drivers; null when there are none. */
function splitMentions(value: string, known: ReadonlySet<string>): PhrasingContent[] | null {
  const nodes: PhrasingContent[] = [];
  let last = 0;
  for (const match of value.matchAll(MENTION_PATTERN)) {
    const username = match[1].toLowerCase();
    if (!known.has(username)) continue;
    if (match.index > last) nodes.push({ type: "text", value: value.slice(last, match.index) } satisfies Text);
    nodes.push({
      type: "link",
      url: `/pilotos/${username}`,
      children: [{ type: "text", value: match[0] }],
      // Becomes a data-mention attribute that the renderer turns into a driver chip
      data: { hProperties: { dataMention: username } },
    } satisfies Link);
    last = match.index + match[0].length;
  }
  if (nodes.length === 0) return null;
  if (last < value.length) nodes.push({ type: "text", value: value.slice(last) });
  return nodes;
}

/**
 * Remark plugin: `@username` of a known driver becomes a link to their
 * profile. Unknown names stay plain text; code and existing links are skipped.
 */
export function remarkMentions({ known }: { known: ReadonlySet<string> }) {
  function walk(node: Parent) {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child.type === "text") {
        const parts = splitMentions(child.value, known);
        if (parts) {
          (node.children as PhrasingContent[]).splice(i, 1, ...parts);
          i += parts.length - 1;
        }
      } else if ("children" in child && child.type !== "link" && child.type !== "linkReference") {
        walk(child);
      }
    }
  }
  return (tree: Root) => walk(tree);
}
