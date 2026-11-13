import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Cookies are needed" };

/** Shown by the proxy when the sandbox cookie was offered and did not come back. */
export default function CookiesNeeded() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
      <h1 className="font-display text-3xl font-semibold tracking-tight">This demo needs cookies switched on</h1>
      <p className="mt-3 leading-relaxed text-muted">
        Every visitor gets a private copy of the sample data, so that what you book or cancel is yours alone. One cookie remembers which copy is yours.
        It holds a random id and nothing about you, and it expires after two days.
      </p>
      <p className="mt-3 leading-relaxed text-muted">Allow cookies for this site, then open the demo again.</p>
      <Link href="/" className="btn btn-primary mt-6">
        Open the demo
      </Link>
    </main>
  );
}
