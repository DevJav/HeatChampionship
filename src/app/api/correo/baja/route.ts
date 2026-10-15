import { unsubscribe } from "@/lib/email/send";

/**
 * One-click unsubscribe (RFC 8058): mail apps POST here from their own
 * "Unsubscribe" button, using the List-Unsubscribe header on every email.
 */
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const ok = await unsubscribe(token);
  return new Response(null, { status: ok ? 200 : 404 });
}
