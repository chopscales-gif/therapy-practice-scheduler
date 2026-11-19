import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { SANDBOX_COOKIE, SANDBOX_COOKIE_OPTIONS, SEEN_COOKIE } from "@/server/cookie";
import { checkForChanges } from "@/server/handoff";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * "Has anything changed since I last looked?" A device asks this every few
 * seconds while a hand-off link is live, and redraws only when the answer is
 * yes. It never creates a sandbox, and the answer says when to stop asking.
 */
export async function GET() {
  const jar = await cookies();
  const sandboxId = jar.get(SANDBOX_COOKIE)?.value;
  const quiet = { changed: false, until: null };
  if (!sandboxId || !UUID.test(sandboxId)) return NextResponse.json(quiet, { headers: { "Cache-Control": "no-store" } });

  const check = await checkForChanges(await getDb(), sandboxId, jar.get(SEEN_COOKIE)?.value);
  const response = NextResponse.json({ changed: check.changed, until: check.until?.getTime() ?? null }, { headers: { "Cache-Control": "no-store" } });
  if (check.stamp) response.cookies.set(SEEN_COOKIE, check.stamp, SANDBOX_COOKIE_OPTIONS);
  return response;
}
