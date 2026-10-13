import { requireAdmin } from "@/lib/session";

/**
 * Renders children only for admins (others get a 404). Used by the admin
 * layout for the UI; pages and actions still call requireAdmin() themselves,
 * because a layout isn't re-run on every navigation.
 */
export async function AdminOnly({ children }: { children: React.ReactNode }) {
  await requireAdmin("/admin");
  return children;
}
