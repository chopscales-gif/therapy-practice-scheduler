import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_CHECK, SANDBOX_COOKIE } from "@/server/cookie";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Gives every visitor a private sandbox id.
 *
 * A first visit is answered with the cookie and a redirect back to the same
 * page with a marker, and the sandbox is only created once the cookie comes back. Anything
 * that does not keep cookies (link previews, crawlers, uptime checks, a
 * browser with cookies blocked) therefore never touches the database.
 */
export function proxy(request: NextRequest) {
  // A cookie that is not one of our ids (edited, or left over from something else) is replaced.
  if (UUID.test(request.cookies.get(SANDBOX_COOKIE)?.value ?? "")) {
    if (!request.nextUrl.searchParams.has(COOKIE_CHECK)) return NextResponse.next();
    // The cookie came back. Drop the marker from the address.
    const clean = request.nextUrl.clone();
    clean.searchParams.delete(COOKIE_CHECK);
    return NextResponse.redirect(clean, 307);
  }

  // Not a page view (a form post, say): let it through, and it is refused with a message about cookies.
  if (request.method !== "GET" && request.method !== "HEAD") return NextResponse.next();

  // The cookie was offered once already and did not come back.
  if (request.nextUrl.searchParams.has(COOKIE_CHECK)) return NextResponse.rewrite(new URL("/cookies-needed", request.url));

  const back = request.nextUrl.clone();
  back.searchParams.set(COOKIE_CHECK, "1");
  const response = NextResponse.redirect(back, 307);
  response.cookies.set(SANDBOX_COOKIE, crypto.randomUUID(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 48, // sandboxes are purged after 48 hours
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
