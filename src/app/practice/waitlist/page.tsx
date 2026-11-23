import type { Metadata } from "next";
import { Flash } from "@/components/flash";
import { PageHeader, Pill } from "@/components/ui";
import { countOf, fmtDay } from "@/lib/time";
import { describeDays, describeParts, waitingDays } from "@/lib/waitlist";
import { listTherapists, waitlistView } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "Waitlist" };

const MODE = { either: "In person or video", office: "In person", video: "Video only" };
/** "Either" means in person with a therapist who does not see clients by video. */
const modeLabel = (mode: keyof typeof MODE, offersVideo: boolean) => (mode === "either" && !offersVideo ? MODE.office : MODE[mode]);

export default async function WaitlistPage() {
  const ctx = await getCtx();
  const [rows, therapists] = await Promise.all([waitlistView(ctx), listTherapists(ctx)]);
  const therapistOf = (id: string | null) => therapists.find((therapist) => therapist.id === id);
  const therapistName = (id: string | null) => (id ? (therapistOf(id)?.name ?? "") : "Any therapist");

  return (
    <>
      <PageHeader title="Waitlist">
        <strong className="font-bold text-ink">
          <Flash value={String(rows.length)}>{rows.length} waiting</Flash>
        </strong>
        , longest first. When an appointment is cancelled, the time goes to the first person here whose days, times and therapist fit it.
      </PageHeader>
      {rows.length === 0 ? (
        <p className="panel max-w-[44rem] px-5 py-4 text-ink-soft">Nobody is waiting. Clients join from the waitlist page on the practice&apos;s website.</p>
      ) : (
        <ol className="grid max-w-[72rem] gap-2.5">
          {rows.map(({ entry, client, hasLiveOffer }, index) => {
            const days = waitingDays(entry.joinedAt, ctx.now);
            return (
              <li
                key={entry.id}
                className={`panel grid gap-x-6 gap-y-3 px-4 py-4 sm:px-5 md:grid-cols-[2.75rem_minmax(0,1.1fr)_minmax(0,1.7fr)_9.5rem] md:items-center ${
                  hasLiveOffer ? "!border-wait/50 !bg-amber-tint" : ""
                }`}
              >
                <span className="hidden font-display text-[2rem] leading-none text-accent md:block">{index + 1}</span>
                <div>
                  <p className="text-[1.125rem] font-bold leading-tight">
                    <span className="mr-2 font-display text-accent md:hidden">{index + 1}.</span>
                    {client.name}
                  </p>
                  {hasLiveOffer && (
                    <p className="mt-1.5">
                      <Pill is="waiting">Holding an offer now</Pill>
                    </p>
                  )}
                </div>
                <dl className="grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)]">
                  <div>
                    <dt className="eyebrow">Therapist</dt>
                    <dd className="font-bold leading-snug">{therapistName(entry.therapistId)}</dd>
                  </div>
                  <div>
                    <dt className="eyebrow">Could come</dt>
                    <dd className="font-bold leading-snug">{describeDays(entry.days)}</dd>
                    <dd className="text-[0.9375rem] leading-snug text-ink-soft">{describeParts(entry.parts)}</dd>
                  </div>
                  <div>
                    <dt className="eyebrow">Where</dt>
                    <dd className="font-bold leading-snug">{modeLabel(entry.mode, therapistOf(entry.therapistId)?.offersVideo ?? true)}</dd>
                  </div>
                </dl>
                <div className="md:text-right">
                  <p className="eyebrow">Waiting</p>
                  <p className="font-bold leading-snug">{days === 0 ? "Joined today" : countOf(days, "day")}</p>
                  {days > 0 && <p className="text-[0.875rem] text-muted">since {fmtDay(entry.joinedAt)}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
