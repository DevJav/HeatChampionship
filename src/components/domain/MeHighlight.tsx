import { USERNAME_PATTERN } from "@/lib/auth-rules";
import { getCurrentUser } from "@/lib/session";

/**
 * Colors the logged-in driver's name wherever it appears. Names carry
 * data-driver={username}; this streams in one stylesheet targeting that value,
 * so pages stay static and the same markup serves every visitor.
 * Reads cookies: render inside <Suspense>.
 */
export async function MeHighlight() {
  const user = await getCurrentUser();
  // The pattern also keeps the value safe to drop into a CSS selector
  if (!user?.username || !USERNAME_PATTERN.test(user.username)) return null;

  const me = `[data-driver="${user.username}"]`;
  return (
    <style>{`
      ${me}:not(polyline) {
        color: var(--me-fg);
      }
      polyline${me} {
        stroke-width: 3.5px;
      }
      polyline${me}:not([data-leader]) {
        stroke: var(--me-line);
      }
      [data-driver-legend="${user.username}"] {
        display: flex;
      }
    `}</style>
  );
}
