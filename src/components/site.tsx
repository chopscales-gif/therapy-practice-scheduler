"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePractice } from "./practice-context";

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

const shell = "mx-auto w-full max-w-[84rem] px-5 sm:px-8 lg:px-12";

/** The practice's name as its sign reads: the fictional one in two lines, a visitor's own in one. */
export function PracticeSign({ under }: { under?: string }) {
  const practice = usePractice();
  const second = under ?? (practice.custom ? null : `Counseling, ${practice.city.split(",")[0]}`);
  return (
    <span className="min-w-0 font-display text-[1.4375rem] leading-[1.1] tracking-[-0.01em] [overflow-wrap:anywhere]">
      {practice.custom ? practice.name : "Larkspur"}
      {second && <span className="block font-sans text-[0.875rem] tracking-normal opacity-70">{second}</span>}
    </span>
  );
}

type FrameProps = {
  /** The page's one headline. Wrap the words to pick out in <em>. */
  title: React.ReactNode;
  lede?: React.ReactNode;
  /** A line above the headline, such as a greeting. */
  greeting?: string;
  /** The appointment card, set beside the headline on the photograph. */
  card?: React.ReactNode;
  /** The booking page speaks loudest. Every other page uses the quieter size. */
  loud?: boolean;
  /** Full-width sections under the work of the page, such as how the practice runs. */
  below?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * The practice's public website, around every client-side page. A white header,
 * then the first screen: a photograph of a calm room set in from the edges with
 * rounded corners, the headline on it and the appointment card beside it. The
 * work of the page happens on the paper below.
 */
export function SiteFrame({ title, lede, greeting, card, loud = false, below, children }: FrameProps) {
  const practice = usePractice();
  const pathname = usePathname();
  return (
    <div className="flex flex-1 flex-col bg-surface">
      <header className={`${shell} flex flex-wrap items-center justify-between gap-x-8 gap-y-1 py-3 sm:py-4`}>
        <Link href="/" className="flex min-h-11 items-center gap-3 rounded-sm text-dusk">
          <LarkspurMark className="h-10 w-6 shrink-0 text-accent" />
          <PracticeSign />
        </Link>
        <nav aria-label={`${practice.shortName} website`} className="flex flex-wrap items-center gap-x-2 sm:gap-x-3">
          <span className="mr-3 whitespace-nowrap font-semibold tabular-nums text-ink-soft max-md:hidden">{practice.phone}</span>
          <Link
            href="/waitlist"
            aria-current={pathname === "/waitlist" ? "page" : undefined}
            className={`btn min-h-11 px-4 max-sm:hidden ${pathname === "/waitlist" ? "bg-accent-tint text-accent-deep" : "text-ink hover:bg-paper"}`}
          >
            Join the waitlist
          </Link>
          <Link href="/" aria-current={pathname === "/" ? "page" : undefined} className="btn btn-primary min-h-11 max-sm:px-4">
            <span>
              Book<span className="max-sm:sr-only"> an appointment</span>
            </span>
          </Link>
        </nav>
      </header>

      <div className="px-2.5 sm:px-4">
        <section className={`relative isolate mx-auto max-w-[110rem] overflow-hidden rounded-[1.75rem] sm:rounded-[2.25rem] ${loud ? "lg:min-h-[min(41rem,calc(100vh-11rem))]" : ""} lg:flex lg:items-center`}>
          <Image src="/photos/room.jpg" alt="" fill preload sizes="100vw" className="-z-20 object-cover" />
          <div aria-hidden className="hero-wash absolute inset-0 -z-10" />
          <div className={`${shell} grid items-center gap-x-12 gap-y-7 ${loud ? "py-9 sm:py-14 lg:py-16" : "py-8 sm:py-12 lg:py-14"} ${card ? "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]" : ""}`}>
            <div className={card ? "" : "max-w-[52rem]"}>
              {greeting && <p className="mb-3 text-lg font-semibold text-accent-deep sm:text-xl">{greeting}</p>}
              <h1
                className={`display text-dusk [&_em]:not-italic [&_em]:text-accent ${
                  loud ? "text-[clamp(2.6rem,6vw,5.25rem)] leading-[1]" : "text-[clamp(2.25rem,4.4vw,3.75rem)]"
                }`}
              >
                {title}
              </h1>
              {lede && <p className={`mt-5 max-w-[42ch] text-[1.125rem] leading-relaxed text-ink-soft sm:text-[1.25rem]`}>{lede}</p>}
            </div>
            {card && <div className="min-w-0 lg:w-full lg:max-w-[30rem] lg:justify-self-end">{card}</div>}
          </div>
        </section>
      </div>

      <main className={`${shell} flex-1 pb-16 pt-10 lg:pb-20 lg:pt-14`}>{children}</main>
      {below}

      <footer className="on-dusk mt-auto bg-dusk text-white">
        <div className={`${shell} grid gap-x-12 gap-y-8 py-12 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.3fr)] lg:py-14`}>
          <div>
            <p className="flex items-center gap-3">
              <LarkspurMark className="h-10 w-6 shrink-0 text-blush" />
              <PracticeSign />
            </p>
            <p className="mt-4 leading-relaxed text-dusk-soft">
              {practice.city}
              <br />
              <span className="tabular-nums">{practice.phone}</span>
            </p>
          </div>
          <nav aria-label="Footer" className="grid content-start gap-1">
            <p className="mb-1 font-semibold">Appointments</p>
            <Link href="/" className="w-fit py-1 text-dusk-soft underline-offset-4 hover:text-white hover:underline">
              Book an appointment
            </Link>
            <Link href="/waitlist" className="w-fit py-1 text-dusk-soft underline-offset-4 hover:text-white hover:underline">
              Join the waitlist
            </Link>
          </nav>
          <div>
            <p className="mb-2 font-semibold">If you need help now</p>
            <p className="leading-relaxed text-dusk-soft">In an emergency, call 911. For the Suicide and Crisis Lifeline, call or text 988.</p>
          </div>
        </div>
        <div className="border-t border-white/15">
          <p className={`${shell} py-5 text-sm leading-relaxed text-dusk-soft`}>
            {/* A visitor's own practice is real, so only the sample data is called invented. */}
            {practice.custom
              ? "A demonstration build by ChopMedia, shown with your practice's name on invented sample data."
              : `${practice.name}, ${practice.city}, is a fictional practice in a demonstration build by ChopMedia.`}{" "}
            This demo is designed with HIPAA in mind. It is not HIPAA compliant or certified. Photographs are stock images. The people shown are not
            the practice&apos;s clients or clinicians.
          </p>
        </div>
      </footer>
    </div>
  );
}

export type CardLine = { label: string; value: string | null; note?: string | null; struck?: boolean };

/**
 * The appointment card: the small printed card a front desk hands over, with a
 * dashed line for each thing still to be decided.
 */
export function AppointmentCard({ heading, lines, footer, story }: { heading: string; lines: CardLine[]; footer?: React.ReactNode; story?: string }) {
  const practice = usePractice();
  return (
    <div data-story={story} className="ticket px-5 pb-5 pt-4 text-ink sm:px-7 sm:pb-7 sm:pt-6">
      <p className="flex items-baseline justify-between gap-4 pb-2.5">
        <span className="font-display text-[1.375rem] tracking-[-0.01em] sm:text-2xl">{heading}</span>
        <span className="eyebrow min-w-0 truncate !text-[0.75rem] max-sm:hidden">{practice.name}</span>
      </p>
      {/* Two by two on a phone, so the first choice of the page is still on the first screen. */}
      <dl className="grid grid-cols-2 gap-x-5 lg:block">
        {lines.map((line) => (
          <div key={line.label} className="border-t border-line py-2 lg:grid lg:grid-cols-[4.5rem_minmax(0,1fr)] lg:items-baseline lg:gap-x-3 lg:py-2.5">
            <dt className="eyebrow !text-[0.75rem] lg:!text-[0.8rem]">{line.label}</dt>
            <dd className="min-h-7 lg:min-h-9">
              {line.value ? (
                <span className={`text-[1.125rem] font-semibold leading-tight lg:text-[1.3125rem] ${line.struck ? "line-through decoration-flag decoration-2" : ""}`}>{line.value}</span>
              ) : (
                <span className="sr-only">Not chosen yet</span>
              )}
              {line.note && <span className="block text-[0.8125rem] leading-snug text-muted lg:text-[0.875rem]">{line.note}</span>}
            </dd>
          </div>
        ))}
      </dl>
      {footer && <div className="mt-1 rounded-xl bg-paper px-3.5 py-2.5 text-[0.9375rem] leading-snug text-ink-soft">{footer}</div>}
    </div>
  );
}

/** The heading of one numbered step of a client page. */
export function StepHeading({ n, id, children }: { n: number; id?: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="display flex items-center gap-3 text-[1.625rem] !leading-tight text-dusk sm:text-[1.9375rem]">
      <span className="step-n">{n}</span>
      {children}
    </h2>
  );
}

/** A note from the demo to the person trying it, kept visibly apart from the practice's own screens. */
export function DemoHint({ children, className = "", story }: { children: React.ReactNode; className?: string; story?: string }) {
  return (
    <aside data-story={story} className={`max-w-[44rem] rounded-2xl border-[1.5px] border-dashed border-amber bg-amber-tint/50 px-5 py-3.5 leading-relaxed ${className}`}>
      <p className="eyebrow !text-amber">In this demo</p>
      <div className="mt-1 text-ink">{children}</div>
    </aside>
  );
}
