import type { Metadata } from "next";
import Link from "next/link";
import { Flash } from "@/components/flash";
import { PhoneOffer } from "@/components/handoff";
import { OpeningChip, PageHeader } from "@/components/ui";
import { OFFER_WINDOW_MINUTES } from "@/lib/practice";
import { countOf, fmtDayLong, fmtTime, fmtDay, minutesBetween } from "@/lib/time";
import { openingsView } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "Cancellations" };

const DOT = { neutral: "bg-open", good: "bg-accent", warn: "bg-wait" };
const EDGE = { offering: "border-l-wait", filled: "border-l-accent", unfilled: "border-l-flag" };

export default async function CancellationsPage() {
  const ctx = await getCtx();
  const openings = await openingsView(ctx);

  return (
    <>
      <PageHeader title="Cancellations">
        Every cancelled appointment and what became of the time. The waitlist is worked automatically; this page is the record of it.
      </PageHeader>
      {openings.length === 0 && (
        <p className="panel max-w-[44rem] px-5 py-4 text-ink-soft">
          No cancellations yet. Cancel an appointment from the calendar and what becomes of the time is written here.
        </p>
      )}
      <div className="grid max-w-[72rem] gap-5">
        {openings.map(({ opening, therapist, events, live }) => (
          <article
            key={opening.id}
            id={opening.id}
            data-story="opening"
            className={`panel scroll-mt-4 border-l-[6px] ${EDGE[opening.status]} px-4 py-4 target:outline target:outline-2 target:outline-dusk sm:px-6 sm:py-5 xl:grid xl:grid-cols-[19rem_minmax(0,1fr)] xl:gap-x-8`}
          >
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 xl:flex-col xl:justify-start">
              <div>
                <p className="eyebrow">The time</p>
                <h2 className="font-display text-[1.6rem] font-medium leading-[1.1] text-dusk">
                  {fmtDayLong(opening.startsAt)}
                  <span className="block">{fmtTime(opening.startsAt)}</span>
                </h2>
                <p className="mt-1.5 font-bold leading-snug">{therapist.name}</p>
                <p className="text-[0.9375rem] text-muted">{therapist.credentials}</p>
              </div>
              <Flash value={opening.status}>
                <OpeningChip status={opening.status} />
              </Flash>
            </div>

            <div className="mt-4 xl:mt-0">
              {live && (
                <div className="mb-4 rounded-[0.5rem] border-[1.5px] border-wait bg-amber-tint px-4 py-3.5">
                  <p className="eyebrow !text-amber">Waiting on an answer</p>
                  <p className="mt-0.5 text-[1.125rem] leading-snug">
                    <strong className="font-bold">{live.clientName}</strong> has until <strong className="font-bold">{fmtTime(live.offer.expiresAt)}</strong> to take it (
                    {countOf(Math.max(0, minutesBetween(ctx.now, live.offer.expiresAt)), "minute")} left).
                  </p>
                  <div className="mt-3 border-t border-dashed border-amber pt-3">
                    <p className="eyebrow !text-amber">In this demo</p>
                    <p className="mt-0.5 text-[0.9375rem] leading-relaxed">
                      Answer as {live.clientName.split(" ")[0]}, or use <strong className="font-bold">Skip {OFFER_WINDOW_MINUTES} min</strong> in the bar at the top to let the
                      offer lapse and pass to the next person.
                    </p>
                    <div className="mt-3 flex flex-wrap items-start gap-2.5">
                      <Link href={`/offer/${live.offer.token}`} data-story="open-offer" className="btn btn-primary w-full sm:w-auto">
                        Open the link {live.clientName.split(" ")[0]} received
                      </Link>
                      <PhoneOffer path={`/offer/${live.offer.token}`} firstName={live.clientName.split(" ")[0]} />
                    </div>
                  </div>
                </div>
              )}

              <p className="eyebrow">What happened</p>
              <ol className="mt-2">
                {events.map((event, index) => (
                  <li key={event.id} className={`relative grid grid-cols-[4.75rem_1fr] gap-x-3 ${index === events.length - 1 ? "arrive" : ""}`}>
                    <span className="pt-px text-right text-[0.875rem] font-bold leading-6 tabular-nums text-muted">
                      {fmtTime(event.at)}
                      {index === 0 && <span className="block font-normal leading-tight">{fmtDay(event.at)}</span>}
                    </span>
                    <p className={`relative border-l-2 border-rule pl-4 leading-6 ${index === events.length - 1 ? "pb-0.5" : "pb-3"} ${event.tone === "good" ? "font-bold text-accent" : ""}`}>
                      <span className={`absolute -left-[0.4375rem] top-[0.4375rem] size-3 rounded-full ring-2 ring-surface ${DOT[event.tone]}`} />
                      {event.text}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
