import type { Metadata } from "next";
import Link from "next/link";
import { SiteFrame } from "@/components/site";

export const metadata: Metadata = { title: "Cookies are needed" };

/** Shown by the proxy when the sandbox cookie was offered and did not come back. */
export default function CookiesNeeded() {
  return (
    <SiteFrame
      title={
        <>
          This demo needs cookies <em>switched on.</em>
        </>
      }
    >
      <section className="max-w-[44rem]">
        <p className="text-[1.0625rem] leading-relaxed text-ink-soft">
          Every visitor gets a private copy of the sample data, so that what you book or cancel is yours alone. One cookie remembers which copy is yours.
          It holds a random id and nothing about you, and it expires after two days.
        </p>
        <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-soft">Allow cookies for this site, then open the demo again.</p>
        <Link href="/" className="btn btn-primary mt-6">
          Open the demo
        </Link>
      </section>
    </SiteFrame>
  );
}
