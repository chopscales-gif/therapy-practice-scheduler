import type { Metadata } from "next";
import Link from "next/link";
import { OpeningChip, PageHeader } from "@/components/ui";
import { OFFER_WINDOW_MINUTES } from "@/lib/practice";
import { countOf, fmtDateTimeLong, fmtTime, fmtDay, minutesBetween } from "@/lib/time";
import { openingsView } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "Cancellations" };

const DOT = { neutral: "bg-rule", good: "bg-good", warn: "bg-amber" };

export default async function CancellationsPage() {
  const ctx = await getCtx();
  const openings = await openingsView(ctx);

  return (
    <>
      <PageHeader title="Cancellations">
        Every cancelled appointment and what became of the time. The waitlist is worked automatically; this page is the record of it.
      </PageHeader>
      {openings.length === 0 && <p className="max-w-[60ch] border-t-2 border-ink pt-4 text-muted">No cancellations yet. Cancel an appointment from the calendar and what becomes of the time is written here.</p>}
      <div className="grid max-w-[68rem] gap-10">
        {openings.map(({ opening, therapist, events, live }) => (
          <article key={opening.id} id={opening.id} className="scroll-mt-4 border-t-2 border-ink pt-4 target:border-accent xl:grid xl:grid-cols-[17rem_minmax(0,1fr)] xl:gap-x-10">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 xl:flex-col xl:justify-start">
              <div>
                <h2 className="font-display text-2xl font-medium leading-tight">{fmtDateTimeLong(opening.startsAt)}</h2>
                <p className="mt-1 text-muted">
                  {therapist.name}, {therapist.credentials}
                </p>
              </div>
              <OpeningChip status={opening.status} />
            </div>

            <div>

            <ol className="panel mt-4 px-4 pb-2 pt-5 sm:px-6 xl:mt-0">
              {events.map((event, index) => (
                <li key={event.id} className={`relative grid grid-cols-[4.75rem_1fr] gap-x-3 ${index === events.length - 1 ? "arrive" : ""}`}>
                  <span className="pt-px text-right text-[0.875rem] leading-6 tabular-nums text-muted">
                    {fmtTime(event.at)}
                    {index === 0 && <span className="block leading-tight">{fmtDay(event.at)}</span>}
                  </span>
                  <p className={`relative border-l-2 border-rule pb-3 pl-4 leading-6 ${event.tone === "good" ? "font-semibold text-good" : ""}`}>
                    <span className={`absolute -left-[0.4375rem] top-[0.4375rem] size-3 rounded-full ring-2 ring-surface ${DOT[event.tone]}`} />
                    {event.text}
                  </p>
                </li>
              ))}
            </ol>

            {live && (
              <div className="mt-4">
                <p className="border-l-4 border-amber bg-amber-tint px-4 py-3 leading-relaxed text-ink">
                  <strong className="font-semibold">{live.clientName}</strong> has until {fmtTime(live.offer.expiresAt)} to answer (
                  {countOf(Math.max(0, minutesBetween(ctx.now, live.offer.expiresAt)), "minute")} left).
                </p>
                <div className="mt-4 rounded-[0.25rem] border border-dashed border-amber bg-amber-tint/60 px-4 py-3">
                  <p className="text-sm font-semibold text-amber">In this demo</p>
                  <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink">
                    Answer as {live.clientName.split(" ")[0]}, or use <strong className="font-semibold">Skip {OFFER_WINDOW_MINUTES} minutes</strong> in the top bar to let the
                    offer lapse and pass to the next person.
                  </p>
                  <Link href={`/offer/${live.offer.token}`} className="btn btn-primary mt-3 w-full sm:w-auto">
                    Open the link {live.clientName.split(" ")[0]} received
                  </Link>
                </div>
              </div>
            )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
