import type { Metadata } from "next";
import Link from "next/link";
import { OpeningChip, PageHeader } from "@/components/ui";
import { fmtDateTimeLong, fmtTime, fmtDay, minutesBetween } from "@/lib/time";
import { openingsView } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "Cancellations" };

const DOT = { neutral: "bg-line", good: "bg-good", warn: "bg-amber" };

export default async function CancellationsPage() {
  const ctx = await getCtx();
  const openings = await openingsView(ctx);

  return (
    <>
      <PageHeader title="Cancellations">
        Every cancelled appointment and what became of the time. The waitlist is worked automatically; this page is the record of it.
      </PageHeader>
      {openings.length === 0 && <p className="panel px-5 py-5 text-muted">No cancellations yet.</p>}
      <div className="grid max-w-3xl gap-5">
        {openings.map(({ opening, therapist, events, live }) => (
          <article key={opening.id} id={opening.id} className="panel scroll-mt-4 px-4 py-5 target:border-accent target:shadow-[0_0_0_1px_var(--color-accent)] sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <div>
                <h2 className="font-display text-xl font-semibold leading-tight tracking-tight">{fmtDateTimeLong(opening.startsAt)}</h2>
                <p className="text-muted">
                  {therapist.name}, {therapist.credentials}
                </p>
              </div>
              <OpeningChip status={opening.status} />
            </div>

            <ol className="mt-4">
              {events.map((event, index) => (
                <li key={event.id} className={`relative grid grid-cols-[4.75rem_1fr] gap-x-3 ${index === events.length - 1 ? "arrive" : ""}`}>
                  <span className="pt-px text-right text-[0.8125rem] leading-6 tabular-nums text-muted">
                    {fmtTime(event.at)}
                    {index === 0 && <span className="block leading-tight">{fmtDay(event.at)}</span>}
                  </span>
                  <p className={`relative border-l-2 border-line pb-3 pl-4 leading-6 ${event.tone === "good" ? "font-semibold text-good" : ""}`}>
                    <span className={`absolute -left-[0.4375rem] top-[0.4375rem] size-3 rounded-full ring-2 ring-surface ${DOT[event.tone]}`} />
                    {event.text}
                  </p>
                </li>
              ))}
            </ol>

            {live && (
              <div className="mt-4 rounded-lg bg-amber-tint px-4 py-3">
                <p className="leading-relaxed text-amber">
                  <strong className="font-semibold">{live.clientName}</strong> has until {fmtTime(live.offer.expiresAt)} to answer (
                  {Math.max(0, minutesBetween(ctx.now, live.offer.expiresAt))} minutes left).
                </p>
                <div className="mt-3 rounded-lg border border-dashed border-ink/40 bg-surface px-3 py-3">
                  <p className="text-sm font-semibold">In this demo</p>
                  <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-soft">
                    Answer as {live.clientName.split(" ")[0]}, or use <strong className="font-semibold">Skip 20 minutes</strong> in the top bar to let the
                    offer lapse and pass to the next person.
                  </p>
                  <Link href={`/offer/${live.offer.token}`} className="btn btn-primary mt-3 w-full sm:w-auto">
                    Open the link {live.clientName.split(" ")[0]} received
                  </Link>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
