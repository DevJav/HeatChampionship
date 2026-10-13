/**
 * Only allow same-site relative paths as post-login destinations,
 * so ?volver= can't be used to bounce users to another site.
 */
export function safeReturnPath(value: unknown, fallback = "/") {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}
