/** Name of the cookie that holds the visitor's sandbox id. Kept dependency-free so the proxy can import it. */
export const SANDBOX_COOKIE = "sandbox";

/** Query marker the proxy adds to a first visit, to tell "cookie not set yet" from "cookies are blocked". */
export const COOKIE_CHECK = "start";
