import Link from "next/link";
import { PRACTICE } from "@/lib/practice";

/** A spike of larkspur: the practice's mark. */
export function LarkspurMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 40" aria-hidden="true" className={className} fill="none">
      <path d="M12 39V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="4" r="2" fill="currentColor" />
      <ellipse cx="8" cy="10" rx="3" ry="2.4" transform="rotate(-28 8 10)" fill="currentColor" />
      <ellipse cx="16.5" cy="14.5" rx="3.6" ry="2.8" transform="rotate(28 16.5 14.5)" fill="currentColor" />
      <ellipse cx="6.8" cy="19.5" rx="4" ry="3.1" transform="rotate(-28 6.8 19.5)" fill="currentColor" />
      <ellipse cx="17.6" cy="25" rx="4.3" ry="3.3" transform="rotate(28 17.6 25)" fill="currentColor" />
      <path d="M12 33c-3.5-.4-5.6-2-6.6-4.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const NAV = [
  { href: "/", label: "Book an appointment" },
  { href: "/waitlist", label: "Join the waitlist" },
];

/**
 * The fictional practice's public website frame, around every client-side page.
 * On a laptop the practice's own panel stays put on the left, with what the page
 * is about, while the work of the page happens on the right. On a phone the
 * panel is the top of the page.
 */
export function SiteFrame({ aside, children }: { aside: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[24rem_minmax(0,1fr)] xl:grid-cols-[29rem_minmax(0,1fr)]">
      <header className="on-dusk bg-dusk text-white">
        <div className="flex flex-col px-5 pb-8 pt-5 sm:px-8 lg:sticky lg:top-0 lg:min-h-[min(100%,calc(100vh-5.5rem))] lg:px-10 lg:pb-10 lg:pt-9 xl:px-12">
          <Link href="/" className="flex min-h-11 items-center gap-3 self-start rounded-sm">
            <LarkspurMark className="h-10 w-6 text-[#b7c1ee]" />
            <span className="font-display text-[1.375rem] font-medium leading-[1.1]">
              Larkspur
              <span className="block text-[0.9375rem] font-normal italic text-dusk-soft">Counseling, {PRACTICE.city.split(",")[0]}</span>
            </span>
          </Link>
          <nav aria-label="Larkspur website" className="mt-5 flex flex-wrap gap-x-6 border-t border-white/15 pt-1 lg:hidden">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="flex min-h-11 items-center font-semibold underline decoration-white/40 underline-offset-4">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-6 lg:mt-14">{aside}</div>
          <p className="mt-auto hidden pt-10 text-[0.9375rem] leading-relaxed text-dusk-soft lg:block">
            Questions, or rather talk to someone? Call the front desk on <span className="whitespace-nowrap font-semibold text-white">{PRACTICE.phone}</span>.
          </p>
        </div>
      </header>

      <div className="flex min-w-0 flex-col">
        <nav aria-label="Larkspur website" className="hidden items-center gap-8 border-b border-line px-10 lg:flex xl:px-14">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="flex min-h-14 items-center font-semibold hover:text-accent">
              {item.label}
            </Link>
          ))}
          <span className="ml-auto tabular-nums text-muted">{PRACTICE.phone}</span>
        </nav>
        <main className="w-full max-w-[60rem] flex-1 px-5 py-8 sm:px-8 lg:px-10 lg:py-10 xl:px-14">{children}</main>
        <footer className="border-t border-line px-5 py-5 sm:px-8 lg:px-10 xl:px-14">
          <p className="max-w-[60rem] text-sm leading-relaxed text-muted">
            {PRACTICE.name}, {PRACTICE.city}, is a fictional practice in a demonstration build by ChopMedia. In an emergency, call 911. For the Suicide
            and Crisis Lifeline, call or text 988. This demo is designed with HIPAA in mind. It is not HIPAA compliant or certified.
          </p>
        </footer>
      </div>
    </div>
  );
}

/** The heading and opening words of a client page, set on the practice's panel. */
export function AsideIntro({ greeting, title, children }: { greeting?: string; title: string; children?: React.ReactNode }) {
  return (
    <>
      {greeting && <p className="font-display text-xl italic text-dusk-soft">{greeting}</p>}
      <h1 className="font-display text-[2.5rem] font-medium leading-[1.05] tracking-[-0.01em] xl:text-[3.25rem]">{title}</h1>
      {children && <p className="mt-4 max-w-[34ch] text-[1.0625rem] leading-relaxed text-dusk-soft">{children}</p>}
    </>
  );
}

export type CardLine = { label: string; value: string | null; note?: string | null; struck?: boolean };

/**
 * The appointment card: the small printed card a front desk hands over, with a
 * ruled line for each thing still to be decided.
 */
export function AppointmentCard({ heading, lines, footer, className = "" }: { heading: string; lines: CardLine[]; footer?: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[0.25rem] bg-surface px-5 pb-5 pt-4 text-ink shadow-[0_1px_0_rgba(0,0,0,0.25),0_14px_30px_-12px_rgba(0,0,0,0.55)] ${className}`}>
      <p className="flex items-baseline justify-between gap-4 border-b-2 border-ink pb-2">
        <span className="font-display text-xl font-medium italic">{heading}</span>
        <span className="text-[0.8125rem] text-muted">{PRACTICE.name}</span>
      </p>
      <dl>
        {lines.map((line) => (
          <div key={line.label} className="card-rule grid grid-cols-[4.25rem_minmax(0,1fr)] items-baseline gap-x-3 py-2.5">
            <dt className="text-[0.8125rem] text-muted">{line.label}</dt>
            <dd className="min-h-7">
              {line.value && (
                <span className={`font-display text-[1.3125rem] font-medium leading-tight ${line.struck ? "line-through decoration-flag decoration-2" : ""}`}>{line.value}</span>
              )}
              {line.note && <span className="block text-[0.8125rem] text-muted">{line.note}</span>}
            </dd>
          </div>
        ))}
      </dl>
      {footer && <div className="pt-3 text-[0.9375rem] leading-snug text-ink-soft">{footer}</div>}
    </div>
  );
}

/** A note from the demo to the person trying it, kept visibly apart from the practice's own screens. */
export function DemoHint({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <aside className={`max-w-[44rem] rounded-[0.25rem] border border-dashed border-amber bg-amber-tint/60 px-4 py-3 leading-relaxed ${className}`}>
      <p className="text-sm font-semibold text-amber">In this demo</p>
      <div className="mt-1 text-[0.9375rem] text-ink">{children}</div>
    </aside>
  );
}
