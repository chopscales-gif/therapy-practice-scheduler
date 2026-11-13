import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/action-button";
import { DemoHint, SiteFrame } from "@/components/site";
import { MODE_LABEL } from "@/lib/practice";
import { fmtDateTimeLong, fmtTime, minutesBetween } from "@/lib/time";
import { respondToOfferAction } from "@/server/actions";
import { offerByToken } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "A time has opened" };

const HEADING = {
  sent: "A time has opened for you",
  accepted: "It is yours",
  declined: "You passed on this one",
  expired: "This offer has passed to the next person",
};

export default async function OfferPage({ params }: PageProps<"/offer/[token]">) {
  const { token } = await params;
  const ctx = await getCtx();
  const view = await offerByToken(ctx, token);
  if (!view) notFound();
  const { offer, opening, therapist, client } = view;
  const minutesLeft = Math.max(0, minutesBetween(ctx.now, offer.expiresAt));

  return (
    <SiteFrame>
      <p className="text-muted">Hello {client.name.split(" ")[0]},</p>
      <h1 className="mt-1 font-display text-4xl font-semibold leading-[1.1] tracking-tight">{HEADING[offer.status]}</h1>

      <dl className="panel mt-6 grid gap-x-8 gap-y-4 px-5 py-5 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted">When</dt>
          <dd className="mt-0.5 text-lg font-semibold">{fmtDateTimeLong(opening.startsAt)}</dd>
          <dd className="text-sm text-muted">50 minutes, Mountain Time</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">With</dt>
          <dd className="mt-0.5 text-lg font-semibold">
            {therapist.name}, {therapist.credentials}
          </dd>
          <dd className="text-sm text-muted">{therapist.offersVideo ? "In person or video" : MODE_LABEL.office}</dd>
        </div>
      </dl>

      {offer.status === "sent" && (
        <>
          <p className="mt-5 rounded-lg bg-amber-tint px-4 py-3 leading-relaxed text-amber">
            Held for you until <strong className="font-semibold">{fmtTime(offer.expiresAt)}</strong> ({minutesLeft} minutes from now). After that it goes
            to the next person waiting.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start">
            <ActionButton action={respondToOfferAction.bind(null, token, "accept")} pendingLabel="Booking">
              Take this time
            </ActionButton>
            <ActionButton action={respondToOfferAction.bind(null, token, "decline")} pendingLabel="Passing" variant="quiet">
              Pass, and keep my place
            </ActionButton>
          </div>
        </>
      )}
      {offer.status === "accepted" && <p className="mt-5 leading-relaxed">You are booked. A confirmation with a link to change or cancel is on its way.</p>}
      {(offer.status === "declined" || offer.status === "expired") && (
        <p className="mt-5 leading-relaxed">You are still on the waitlist, in the same place, and will be offered the next time that fits.</p>
      )}

      <DemoHint className="mt-10">
        {offer.status === "sent" ? (
          <>
            You are playing {client.name}, who has just received this link by {client.contactBy === "text" ? "text message" : "email"}. Take the time, pass,
            or use <strong className="font-semibold">Skip 20 minutes</strong> in the bar at the top to let the offer lapse.
          </>
        ) : (
          <>
            See what happened to this time under{" "}
            <Link href={`/practice/cancellations#${opening.id}`} className="font-semibold underline">Practice side, Cancellations</Link>.
          </>
        )}
      </DemoHint>
    </SiteFrame>
  );
}
