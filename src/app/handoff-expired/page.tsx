import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "This link has expired" };

/** Shown when a hand-off link is opened after its 15 minutes, or after the demo was reset. */
export default function HandoffExpired() {
  return (
    <main className="w-full max-w-3xl flex-1 px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
      <h1 className="font-display text-4xl leading-tight tracking-[-0.01em] text-dusk sm:text-5xl">This link has expired</h1>
      <p className="mt-4 max-w-[62ch] text-lg leading-relaxed text-muted">
        A link that moves the demo to your phone works for 15 minutes, and stops working if the demo is reset. Make a new one on the first device with
        Continue on your phone, or start the demo fresh on this one.
      </p>
      <Link href="/" className="btn btn-primary mt-6">
        Open the demo here
      </Link>
    </main>
  );
}
