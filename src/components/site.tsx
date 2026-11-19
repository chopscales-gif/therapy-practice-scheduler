"use client";

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

const NAV = [
  { href: "/", label: "Book an appointment" },
  { href: "/waitlist", label: "Join the waitlist" },
];

const shell = "mx-auto w-full max-w-[86rem] px-5 sm:px-8 lg:px-12";

/** The practice's name as its sign reads: the fictional one in two lines, a visitor's own in one. */
export function PracticeSign({ under }: { under?: string }) {
  const practice = usePractice();
  const second = under ?? (practice.custom ? null : `Counseling, ${practice.city.split(",")[0]}`);
  return (
    <span className="min-w-0 font-display text-[1.375rem] font-medium leading-[1.1] [overflow-wrap:anywhere]">
      {practice.custom ? practice.name : "Larkspur"}
      {second && <span className="block text-[0.9375rem] font-normal italic opacity-75">{second}</span>}
    </span>
  );
}

type FrameProps = {
  /** The page's one headline. Wrap the words to pick out in <em>. */
  title: React.ReactNode;
  lede?: React.ReactNode;
  /** A line above the headline, such as a greeting. */
  greeting?: string;
  /** The appointment card, set beside the headline and reaching down into the page. */
  card?: React.ReactNode;
  /** The booking page speaks loudest. Every other page uses the quieter size. */
  loud?: boolean;
  children: React.ReactNode;
};

/**
 * The practice's public website, around every client-side page. The headline
 * sits on the practice's paper with the appointment card beside it; the card
 * overlaps the white sheet below, where the work of the page happens.
 */
export function SiteFrame({ title, lede, greeting, card, loud = false, children }: FrameProps) {
  const practice = usePractice();
  const pathname = usePathname();
  return (
    <div className="flex flex-1 flex-col">
      <header className="relative z-10">
        <div className={`${shell} flex flex-wrap items-center justify-between gap-x-8 gap-y-1 pt-4 sm:pt-6`}>
          <Link href="/" className="flex min-h-11 items-center gap-3 rounded-sm text-dusk">
            <LarkspurMark className="h-10 w-6 shrink-0 text-lark" />
            <PracticeSign />
          </Link>
          <nav aria-label={`${practice.shortName} website`} className="flex flex-wrap items-center gap-x-7">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className={`flex min-h-11 items-center font-bold underline-offset-[6px] hover:text-accent ${pathname === item.href ? "text-dusk underline decoration-accent decoration-2" : "text-ink-soft"}`}
              >
                {item.label}
              </Link>
            ))}
            <span className="whitespace-nowrap font-bold tabular-nums text-dusk max-sm:hidden">{practice.phone}</span>
          </nav>
        </div>
        <div className={`${shell} grid items-end gap-x-10 gap-y-6 pt-6 sm:pt-9 ${card ? "lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]" : ""}`}>
          <div className={card ? "pb-2 lg:pb-12" : "pb-8 lg:pb-12"}>
            {greeting && <p className="mb-1 font-display text-xl italic text-muted sm:text-2xl">{greeting}</p>}
            <h1
              className={`font-display font-medium tracking-[-0.015em] text-dusk [&_em]:not-italic [&_em]:text-accent ${
                loud ? "text-[clamp(2.6rem,6.2vw,5.4rem)] leading-[0.96]" : "text-[clamp(2.25rem,4.6vw,3.75rem)] leading-[1]"
              }`}
            >
              {title}
            </h1>
            {lede && <p className="mt-4 max-w-[40ch] text-[1.125rem] leading-relaxed text-muted sm:mt-5 sm:text-[1.2rem]">{lede}</p>}
          </div>
          {card && <div className="-mb-[34px] min-w-0 lg:justify-self-end lg:w-full lg:max-w-[30rem]">{card}</div>}
        </div>
      </header>

      <div className="flex flex-1 flex-col border-t border-line bg-surface">
        <main className={`${shell} flex-1 pb-12 ${card ? "pt-[70px] lg:pt-16" : "pt-9 lg:pt-12"}`}>{children}</main>
        <footer className="border-t border-line">
          <p className={`${shell} max-w-[86rem] py-5 text-sm leading-relaxed text-muted`}>
            {/* A visitor's own practice is real, so only the sample data is called invented. */}
            {practice.custom
              ? "A demonstration build by ChopMedia, shown with your practice's name on invented sample data."
              : `${practice.name}, ${practice.city}, is a fictional practice in a demonstration build by ChopMedia.`}{" "}
            In an emergency, call 911. For the Suicide and Crisis Lifeline, call or text 988. This demo is designed with HIPAA in mind. It is not HIPAA
            compliant or certified.
          </p>
        </footer>
      </div>
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
    <div data-story={story} className="ticket px-4 pb-4 pt-3.5 text-ink sm:px-[26px] sm:pb-[26px] sm:pt-[22px]">
      <p className="flex items-baseline justify-between gap-4 pb-2.5">
        <span className="font-display text-xl font-medium italic sm:text-[1.3rem]">{heading}</span>
        <span className="eyebrow min-w-0 truncate !text-[0.75rem]">{practice.name}</span>
      </p>
      {/* Two by two on a phone, so the first choice of the page is still on the first screen. */}
      <dl className="grid grid-cols-2 gap-x-5 lg:block">
        {lines.map((line) => (
          <div key={line.label} className="border-t border-dashed border-rule py-2 lg:grid lg:grid-cols-[4.5rem_minmax(0,1fr)] lg:items-baseline lg:gap-x-3 lg:py-2.5">
            <dt className="eyebrow !text-[0.75rem] lg:!text-[0.8rem]">{line.label}</dt>
            <dd className="min-h-7 lg:min-h-9">
              {line.value ? (
                <span className={`font-display text-[1.1875rem] font-medium leading-tight lg:text-[1.55rem] ${line.struck ? "line-through decoration-flag decoration-2" : ""}`}>{line.value}</span>
              ) : (
                <span className="sr-only">Not chosen yet</span>
              )}
              {line.note && <span className="block text-[0.8125rem] leading-snug text-muted lg:text-[0.875rem]">{line.note}</span>}
            </dd>
          </div>
        ))}
      </dl>
      {footer && <div className="border-t border-dashed border-rule pt-3 text-[0.9375rem] leading-snug text-ink-soft">{footer}</div>}
    </div>
  );
}

/** The heading of one numbered step of a client page. */
export function StepHeading({ n, id, children }: { n: number; id?: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="flex items-center gap-3 font-display text-[1.5rem] font-medium leading-tight text-dusk sm:text-[1.7rem]">
      <span className="step-n">{n}</span>
      {children}
    </h2>
  );
}

/** A note from the demo to the person trying it, kept visibly apart from the practice's own screens. */
export function DemoHint({ children, className = "", story }: { children: React.ReactNode; className?: string; story?: string }) {
  return (
    <aside data-story={story} className={`max-w-[44rem] rounded-[0.375rem] border-[1.5px] border-dashed border-amber bg-amber-tint/60 px-4 py-3 leading-relaxed ${className}`}>
      <p className="eyebrow !text-amber">In this demo</p>
      <div className="mt-1 text-ink">{children}</div>
    </aside>
  );
}
