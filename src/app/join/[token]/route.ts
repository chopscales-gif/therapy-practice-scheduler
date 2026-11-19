import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { SANDBOX_COOKIE, SANDBOX_COOKIE_OPTIONS } from "@/server/cookie";
import { redeemHandoff } from "@/server/handoff";

/**
 * Where a hand-off link lands. A live link puts the second device in the same
 * sandbox as the first and sends it to the page that was handed over. The
 * proxy leaves this route alone, so no sandbox is created for the device on
 * the way in, and an unknown or expired link creates nothing at all.
 */
/**
 * A redirect to a path on this same site. The address is left relative so the
 * phone stays on the host it scanned, whatever address the server knows itself by.
 */
function sendTo(path: string) {
  return new NextResponse(null, { status: 307, headers: { Location: path, "Cache-Control": "no-store" } });
}

export async function GET(_request: NextRequest, { params }: RouteContext<"/join/[token]">) {
  const { token } = await params;
  const handoff = await redeemHandoff(await getDb(), token);
  if (!handoff) return sendTo("/handoff-expired");

  const response = sendTo(handoff.path);
  response.cookies.set(SANDBOX_COOKIE, handoff.sandboxId, SANDBOX_COOKIE_OPTIONS);
  return response;
}
