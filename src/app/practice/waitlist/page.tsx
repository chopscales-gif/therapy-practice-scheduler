import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
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
        {rows.length} waiting, longest first. When an appointment is cancelled, the time goes to the first person here whose days, times and therapist
        fit it.
      </PageHeader>
      {rows.length === 0 ? (
        <p className="max-w-[60ch] border-t-2 border-ink pt-4 text-muted">Nobody is waiting. Clients join from the waitlist page on the practice&apos;s website.</p>
      ) : (
        <ol className="panel max-w-[68rem] divide-y divide-line border-t-2 border-t-ink">
          {rows.map(({ entry, client, hasLiveOffer }, index) => (
            <li key={entry.id} className="grid gap-x-6 gap-y-1 px-4 py-4 sm:px-5 md:grid-cols-[2rem_minmax(0,1.2fr)_minmax(0,1.6fr)_10rem] md:items-baseline">
              <span className="hidden font-display text-xl italic text-muted md:block">{index + 1}</span>
              <div>
                <p className="font-semibold">
                  <span className="mr-2 font-display italic text-muted md:hidden">{index + 1}</span>
                  {client.name}
                </p>
                <p className="text-[0.9375rem] text-muted">{therapistName(entry.therapistId)}</p>
              </div>
              <p className="text-[0.9375rem]">
                {describeDays(entry.days)}. {describeParts(entry.parts)}. {modeLabel(entry.mode, therapistOf(entry.therapistId)?.offersVideo ?? true)}.
              </p>
              <div className="md:text-right">
                <p className="font-semibold">
                  {waitingDays(entry.joinedAt, ctx.now) === 0 ? "Joined today" : countOf(waitingDays(entry.joinedAt, ctx.now), "day")}
                </p>
                {waitingDays(entry.joinedAt, ctx.now) > 0 && <p className="text-[0.875rem] text-muted">since {fmtDay(entry.joinedAt)}</p>}
                {hasLiveOffer && <p className="mt-1 inline-block rounded-[0.25rem] border border-dashed border-amber bg-amber-tint px-2.5 py-0.5 text-[0.875rem] font-semibold text-amber">Holding an offer now</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
