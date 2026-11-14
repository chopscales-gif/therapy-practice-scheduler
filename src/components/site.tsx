import Link from "next/link";
import { PRACTICE } from "@/lib/practice";

/** The fictional practice's public website frame, around every client-side page. */
export function SiteFrame({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4 sm:px-6">
          <Link href="/" className="font-display text-2xl font-semibold tracking-tight text-accent-deep">
            {PRACTICE.name}
          </Link>
          <nav aria-label="Larkspur website" className="flex items-center gap-5 font-semibold">
            <Link href="/" className="hover:text-accent">
              Book
            </Link>
            <Link href="/waitlist" className="hover:text-accent">
              Waitlist
            </Link>
            <span className="hidden font-normal text-muted sm:inline">{PRACTICE.phone}</span>
          </nav>
        </div>
      </header>
      <main className={`mx-auto w-full flex-1 px-4 py-8 sm:px-6 sm:py-12 ${wide ? "max-w-5xl" : "max-w-2xl"}`}>{children}</main>
      <footer className="border-t border-line">
        <p className="mx-auto max-w-5xl px-4 py-5 text-sm leading-relaxed text-muted sm:px-6">
          {PRACTICE.name}, {PRACTICE.city}, is a fictional practice in a demonstration build by ChopMedia. In an emergency, call 911. For the Suicide
          and Crisis Lifeline, call or text 988. This demo is designed with HIPAA in mind. It is not HIPAA compliant or certified.
        </p>
      </footer>
    </>
  );
}

/** A note from the demo to the person trying it, kept visibly apart from the practice's own screens. */
export function DemoHint({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <aside className={`rounded-xl border border-dashed border-ink/40 px-4 py-3 leading-relaxed ${className}`}>
      <p className="text-sm font-semibold">In this demo</p>
      <div className="mt-1 text-[0.9375rem] text-ink-soft">{children}</div>
    </aside>
  );
}
