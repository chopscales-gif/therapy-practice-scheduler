import Image from "next/image";
import Link from "next/link";
import { OFFER_WINDOW_MINUTES, REMINDER_HOURS, SESSION_MINUTES } from "@/lib/practice";

const shell = "mx-auto w-full max-w-[84rem] px-5 sm:px-8 lg:px-12";

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six"];
const word = (n: number) => WORDS[n] ?? String(n);

function SectionHead({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[46rem] text-center">
      <p className="eyebrow !text-accent-deep">{label}</p>
      <h2 className="display mt-3 text-[clamp(2rem,4vw,3.25rem)] text-dusk [&_em]:not-italic [&_em]:text-accent">{children}</h2>
    </div>
  );
}

function Tick() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="mt-1 size-5 shrink-0 text-accent" fill="none">
      <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.14" />
      <path d="m6 10.4 2.6 2.6L14 7.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The rest of the practice's front page, under the booking steps: how booking
 * works, the practice's own rules in figures, the waitlist, and questions.
 * Every figure is one of the rules the app really runs on.
 */
export function PracticeStory({ therapists, withVideo }: { therapists: number; withVideo: number }) {
  const steps = [
    { title: "Choose who and when", note: "Every time on the page is really open." },
    { title: "Confirm from your link", note: "One tap, on your phone. Cancel there too." },
    { title: "Get a reminder", note: `${REMINDER_HOURS[0]} hours and ${REMINDER_HOURS[1]} hours before your time.` },
  ];
  const facts = [
    { title: "Every session", figure: String(SESSION_MINUTES), unit: "minutes", note: "The same length each time, in person or by video.", tint: "bg-blush", wide: true },
    { title: "Reminders", figure: `${REMINDER_HOURS[0]} + ${REMINDER_HOURS[1]}`, unit: "hours before", note: "By text or email, whichever you chose.", tint: "bg-peach" },
    { title: "A cancelled time", figure: String(OFFER_WINDOW_MINUTES), unit: "minutes held", note: "Offered to one person on the waitlist at a time.", tint: "bg-butter" },
    { title: "Therapists", figure: word(therapists), unit: "to choose from", note: `${word(withVideo)} also see clients by video.`, tint: "bg-sage" },
  ];
  const questions = [
    { q: "How long is a session?", a: `Every session is ${SESSION_MINUTES} minutes. Times are shown in Mountain Time.` },
    { q: "Can I meet by video?", a: `${word(withVideo)} of our ${word(therapists).toLowerCase()} therapists offer video as well as in person. Choose Video in step 2 and only their times are shown.` },
    { q: "What if I need to cancel?", a: "Use the link in your confirmation or in either reminder. Cancelling there frees the time straight away for someone on the waitlist." },
    { q: "How does the waitlist work?", a: `Tell us the days and times that could suit you. When a matching time is cancelled it is held for you for ${OFFER_WINDOW_MINUTES} minutes. Pass, or miss it, and you keep your place.` },
    { q: "What do I need to book?", a: "A name, an email address and a mobile number, so the confirmation and reminders can reach you. In this demo, use made-up details." },
  ];

  return (
    <>
      <section id="how" className="bg-paper py-16 lg:py-24">
        <div className={shell}>
          <SectionHead label="How booking works">
            Three choices now. <em>Looked after until the day.</em>
          </SectionHead>
          <div className="mt-10 grid items-stretch gap-4 rounded-[2rem] bg-gradient-to-br from-blush via-peach to-butter p-4 sm:p-6 lg:mt-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-8 lg:p-8">
            <ol className="grid content-center gap-3">
              {steps.map((step, index) => (
                <li key={step.title} className="flex items-center gap-4 rounded-[1.75rem] bg-surface px-5 py-4 shadow-rest sm:px-6 sm:py-5">
                  <span className="step-n">{index + 1}</span>
                  <span className="min-w-0">
                    <span className="block text-[1.1875rem] font-semibold leading-snug">{step.title}</span>
                    <span className="block leading-snug text-muted">{step.note}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="relative min-h-[15rem] overflow-hidden rounded-[1.5rem] lg:min-h-[24rem]">
              <Image src="/photos/chairs.jpg" alt="Two wooden chairs by tall windows" fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className={shell}>
          <SectionHead label="What to expect">
            The practice&apos;s rules, <em>in plain figures.</em>
          </SectionHead>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:mt-14 lg:grid-cols-[1.35fr_1fr_1fr_1fr]">
            {facts.map((fact) => (
              <li key={fact.title} className={`flex min-h-[15rem] flex-col justify-between rounded-[1.75rem] p-6 lg:min-h-[21rem] lg:p-7 ${fact.tint}`}>
                <p className="text-[1.0625rem] font-semibold text-ink-soft">{fact.title}</p>
                <div>
                  <p className="display text-[clamp(3rem,5vw,4.5rem)] !leading-none text-dusk">{fact.figure}</p>
                  <p className="mt-1 text-[1.0625rem] font-semibold text-dusk">{fact.unit}</p>
                  <p className="mt-2 leading-snug text-ink-soft">{fact.note}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="waitlist" className="pb-16 lg:pb-24">
        <div className={shell}>
          <div className="grid overflow-hidden rounded-[2rem] bg-gradient-to-br from-accent-tint via-blush to-peach lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <div className="p-7 sm:p-10 lg:p-14">
              <p className="eyebrow !text-accent-deep">The waitlist</p>
              <h2 className="display mt-3 text-[clamp(1.9rem,3.6vw,3rem)] text-dusk">Nothing that suits you this week?</h2>
              <ul className="mt-6 grid gap-3 text-[1.0625rem] leading-snug">
                <li className="flex gap-3">
                  <Tick />
                  Say which days and times of day could work.
                </li>
                <li className="flex gap-3">
                  <Tick />
                  When a matching time is cancelled, it is offered to whoever has waited longest.
                </li>
                <li className="flex gap-3">
                  <Tick />
                  It is held for you for {OFFER_WINDOW_MINUTES} minutes. Pass and you keep your place.
                </li>
              </ul>
              <Link href="/waitlist" className="btn mt-8 bg-surface text-dusk shadow-rest hover:shadow-lift">
                Join the waitlist
              </Link>
            </div>
            <div className="relative min-h-[14rem] lg:min-h-0">
              <Image src="/photos/mug.jpg" alt="Hands in a cream jumper holding a mug" fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
            </div>
          </div>
        </div>
      </section>

      <section id="questions" className="bg-paper py-16 lg:py-24">
        <div className={`${shell} grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]`}>
          <div>
            <p className="eyebrow !text-accent-deep">Questions</p>
            <h2 className="display mt-3 text-[clamp(2rem,4vw,3.25rem)] text-dusk">Before you book</h2>
            <div className="relative mt-8 aspect-[4/3] overflow-hidden rounded-[1.75rem] max-lg:hidden">
              <Image src="/photos/notebook.jpg" alt="An open notebook on a desk" fill sizes="35vw" className="object-cover" />
            </div>
          </div>
          <div className="border-b border-rule">
            {questions.map((item, index) => (
              <details key={item.q} open={index === 0} className="group border-t border-rule">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 py-4 text-[1.1875rem] font-semibold [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5 shrink-0 text-accent transition-transform group-open:rotate-180" fill="none">
                    <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </summary>
                <p className="max-w-[58ch] pb-5 text-[1.0625rem] leading-relaxed text-ink-soft">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
