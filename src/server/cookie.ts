/** Name of the cookie that holds the visitor's sandbox id. Kept dependency-free so the proxy can import it. */
export const SANDBOX_COOKIE = "sandbox";

/** Query marker the proxy adds to a first visit, to tell "cookie not set yet" from "cookies are blocked". */
export const COOKIE_CHECK = "start";

/** Holds the last state of the sandbox this device has drawn, so it can ask whether another device changed anything. */
export const SEEN_COOKIE = "seen";

/** How the sandbox cookie is set, by the proxy on a first visit and by a hand-off link on a second device. */
export const SANDBOX_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 48, // sandboxes are purged after 48 hours
} as const;
