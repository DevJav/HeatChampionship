/**
 * Editing helpers for plain <textarea>s. execCommand keeps the browser's undo
 * history (Ctrl+Z); setRangeText is the fallback where it isn't supported.
 */

/** Replace the selection with `text`, then select `text[from..to]` (or put the cursor at its end). */
export function replaceSelection(textarea: HTMLTextAreaElement, text: string, from = text.length, to = from) {
  textarea.focus();
  const start = textarea.selectionStart;
  if (!document.execCommand("insertText", false, text)) {
    textarea.setRangeText(text, start, textarea.selectionEnd, "end");
  }
  textarea.setSelectionRange(start + from, start + to);
}

// Everything that affects where text wraps inside the textarea
const MIRRORED = [
  "box-sizing", "width", "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
  "padding-top", "padding-right", "padding-bottom", "padding-left", "font-family", "font-size", "font-style",
  "font-weight", "font-stretch", "font-variant", "line-height", "letter-spacing", "word-spacing", "text-indent",
  "text-transform", "tab-size",
];

/**
 * Where a character position sits inside the textarea, in pixels from its
 * top-left corner (scroll included): copies the text into a hidden twin and
 * measures a marker placed at that position.
 */
export function caretPosition(textarea: HTMLTextAreaElement, position: number) {
  const style = getComputedStyle(textarea);
  const mirror = document.createElement("div");
  for (const property of MIRRORED) mirror.style.setProperty(property, style.getPropertyValue(property));
  Object.assign(mirror.style, {
    position: "absolute",
    visibility: "hidden",
    top: "0",
    left: "-9999px",
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
    overflow: "hidden",
  });
  mirror.textContent = textarea.value.slice(0, position);
  const marker = document.createElement("span");
  marker.textContent = "​";
  mirror.append(marker);
  document.body.append(mirror);

  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.4;
  // offsetTop/Left are measured inside the border; the textarea's own box starts outside it
  const result = {
    top: parseFloat(style.borderTopWidth) + marker.offsetTop - textarea.scrollTop,
    left: parseFloat(style.borderLeftWidth) + marker.offsetLeft - textarea.scrollLeft,
    lineHeight,
  };
  mirror.remove();
  return result;
}
