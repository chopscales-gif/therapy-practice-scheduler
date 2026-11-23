import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "About this demo" };

const SAW = [
  "A client picked a therapist and a time and was booked in under a minute, at any hour, without phoning the front desk.",
  "Confirmations and reminders were written and queued by themselves, each with a link the client can use to confirm or cancel.",
  "When a client cancelled, the time was offered straight away to whoever on the waitlist had waited longest and could actually come then, one person at a time, with a time limit on each offer.",
  "The front desk did nothing. Their screens showed what happened, in order, and who holds the time now.",
];

const CONNECTS = [
  { to: "Your practice management or EHR system", what: "Appointments would be read from and written to the calendar the practice already keeps, so nothing is entered twice." },
  { to: "Text messaging and email", what: "Confirmations, reminders and waitlist offers would go out from the practice's own number and address. In the demo they stop at the outbox." },
  { to: "A video service", what: "Video sessions would open from the client's appointment page. No video service is connected here." },
  { to: "Sign-in for staff", what: "The practice side would sit behind staff accounts, with a record of who did what. In the demo anyone can open it." },
];

const linkOnDark = "font-bold text-white underline decoration-white/50 underline-offset-4 hover:decoration-white [overflow-wrap:anywhere]";

/**
 * The closing screen. Unlike every other page, this one is ChopMedia speaking,
 * not the practice, and it makes no claim the demo cannot back: no clients, no
 * numbers, no integrations said to exist.
 */
export default function AboutPage() {
  return (
    <main className="w-full flex-1 bg-surface">
      <div className="mx-auto w-full max-w-[64rem] px-4 pb-16 pt-10 sm:px-6 lg:px-10 lg:pt-14">
        <p className="eyebrow">A demonstration build by ChopMedia</p>
        <h1 className="mt-2 max-w-[20ch] display text-[2.75rem] text-dusk sm:text-[4rem]">
          What you <em className="not-italic text-accent">just saw</em>
        </h1>
        <ol className="mt-7 max-w-[70ch] space-y-3.5">
          {SAW.map((line, i) => (
            <li key={line} className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-baseline gap-x-2 text-lg leading-relaxed">
              <span className="font-display text-[1.6rem] text-accent">{i + 1}</span>
              <span>{line}</span>
            </li>
          ))}
        </ol>

        <div className="mt-12 grid gap-x-12 gap-y-10 border-t border-rule pt-10 lg:grid-cols-2">
          <section>
            <h2 className="font-display text-[1.7rem] leading-tight text-dusk">What a real version would connect to</h2>
            <p className="mt-2 leading-relaxed text-ink-soft">
              Nothing here is connected to anything. Built for a practice, the same steps would be wired to the systems that practice already uses.
            </p>
            <dl className="mt-4 space-y-4">
              {CONNECTS.map((item) => (
                <div key={item.to}>
                  <dt className="font-bold">{item.to}</dt>
                  <dd className="leading-relaxed text-ink-soft">{item.what}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h2 className="font-display text-[1.7rem] leading-tight text-dusk">What this demo is, and is not</h2>
            <dl className="mt-4 space-y-4">
              <div>
                <dt className="font-bold">No AI anywhere</dt>
                <dd className="leading-relaxed text-ink-soft">
                  Who is offered a cancelled time, and in what order, is decided by written rules a practice can read. It behaves the same way every time.
                </dd>
              </div>
              <div>
                <dt className="font-bold">Invented people, a clock you control</dt>
                <dd className="leading-relaxed text-ink-soft">
                  Every client and therapist is made up, and no message leaves the demo. Each visitor gets a private copy of the sample data, and the demo
                  clock moves only when you move it.
                </dd>
              </div>
              <div>
                <dt className="font-bold">Privacy</dt>
                <dd className="leading-relaxed text-ink-soft">
                  Designed with HIPAA in mind: text messages never say what an appointment is for, and every link is private to its client. This demo is
                  not HIPAA compliant or certified, and should not be given real personal or health information.
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>

      <section className="on-dusk bg-dusk text-white">
        <div className="mx-auto w-full max-w-[64rem] px-4 py-10 sm:px-6 lg:px-10 lg:py-12">
          <h2 className="max-w-[26ch] font-display text-[1.9rem] leading-tight sm:text-[2.5rem]">Want to see it run on your own week?</h2>
          <p className="mt-3 max-w-[58ch] text-lg leading-relaxed text-white/85">
            Send me your therapists&apos; hours and how your waitlist works today, and I will set it up that way and walk you through it on a call.
          </p>
          <p className="mt-6 max-w-[58ch] leading-relaxed text-white/85">ChopMedia is Hayden Huelskamp, an engineer based in Utah.</p>
          <dl className="mt-4 grid gap-x-10 gap-y-3 sm:grid-cols-[auto_minmax(0,1fr)]">
            <dt className="text-white/75">Email</dt>
            <dd>
              <a href="mailto:chopscales@gmail.com" className={linkOnDark}>
                chopscales@gmail.com
              </a>
            </dd>
            <dt className="text-white/75">LinkedIn</dt>
            <dd>
              <a href="https://www.linkedin.com/in/hayden-huelskamp-547a86302/" className={linkOnDark}>
                linkedin.com/in/hayden-huelskamp-547a86302
              </a>
            </dd>
            <dt className="text-white/75">The other four demos</dt>
            <dd>
              <a href="https://chopmedia.vercel.app" className={linkOnDark}>
                chopmedia.vercel.app
              </a>
            </dd>
          </dl>
          <div className="mt-8 flex flex-wrap gap-2">
            <Link href="/" className="inline-flex min-h-11 items-center rounded-full bg-white px-5 font-semibold text-dusk hover:bg-white/85">
              Back to the client side
            </Link>
            <Link href="/practice" className="inline-flex min-h-11 items-center rounded-full border-[1.5px] border-white/60 px-5 font-semibold hover:bg-white/15">
              Back to the practice side
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
