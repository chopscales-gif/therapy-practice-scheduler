import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/action-button";
import { AppointmentCard, DemoHint, SiteFrame } from "@/components/site";
import { MODE_LABEL, OFFER_WINDOW_MINUTES, SESSION_MINUTES } from "@/lib/practice";
import { countOf, fmtDayLong, fmtTime, minutesBetween } from "@/lib/time";
import { tone } from "@/lib/tones";
import { modeForOffer } from "@/lib/waitlist";
import { respondToOfferAction } from "@/server/actions";
import { offerByToken } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "A time has opened" };

const HEADING = {
  sent: ["A time has opened", "for you."],
  accepted: ["It is", "yours."],
  declined: ["You passed", "on this one."],
  expired: ["This offer has passed", "to the next person."],
};

export default async function OfferPage({ params }: PageProps<"/offer/[token]">) {
  const { token } = await params;
  const ctx = await getCtx();
  const view = await offerByToken(ctx, token);
  if (!view) notFound();
  const { offer, opening, therapist, client, entry } = view;
  // Someone who asked for either is booked in person unless they asked for video.
  const mode = MODE_LABEL[modeForOffer(entry.mode, therapist.offersVideo)];
  const minutesLeft = Math.max(0, minutesBetween(ctx.now, offer.expiresAt));
  const gone = offer.status === "declined" || offer.status === "expired";
  const [lead, picked] = HEADING[offer.status];

  return (
    <SiteFrame
      greeting={`Hello ${client.name.split(" ")[0]},`}
      title={
        <>
          {lead} <em>{picked}</em>
        </>
      }
      card={
        <AppointmentCard
          heading={offer.status === "accepted" ? "Your appointment" : gone ? "No longer held" : "Held for you"}
          lines={[
            { label: "Day", value: fmtDayLong(opening.startsAt), struck: gone },
            { label: "Time", value: fmtTime(opening.startsAt), note: `${SESSION_MINUTES} minutes, Mountain Time`, struck: gone },
            { label: "With", value: therapist.name, note: therapist.credentials },
            { label: "Where", value: mode },
          ]}
        />
      }
    >
      <div className="max-w-[44rem]">
        {offer.status === "sent" && (
          <>
            <p className="rounded-2xl border border-wait/30 bg-amber-tint px-5 py-4 text-[1.0625rem] leading-snug">
              Held for you until <strong className="font-bold">{fmtTime(offer.expiresAt)}</strong> ({countOf(minutesLeft, "minute")} from now). After that
              it goes to the next person waiting.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start">
              <ActionButton story="take-offer" action={respondToOfferAction.bind(null, token, "accept")} pendingLabel="Booking">
                Take this time
              </ActionButton>
              <ActionButton action={respondToOfferAction.bind(null, token, "decline")} pendingLabel="Passing" variant="quiet">
                Pass, and keep my place
              </ActionButton>
            </div>
          </>
        )}
        {offer.status === "accepted" && (
          <div className="arrive rounded-2xl border border-good/20 bg-good-tint px-5 py-5">
            <p>
              <span className="pill" style={tone("good")}>
                Booked
              </span>
            </p>
            <p className="mt-2 text-[1.0625rem] leading-relaxed">You are booked. A confirmation with a link to cancel, should you need to, is on its way.</p>
          </div>
        )}
        {gone && <p className="text-[1.0625rem] leading-relaxed">You are still on the waitlist, in the same place, and will be offered the next time that fits.</p>}
      </div>

      <DemoHint className="mt-10" story={offer.status === "accepted" ? "offer-taken" : undefined}>
        {offer.status === "sent" ? (
          <>
            You are playing {client.name}, who has just received this link by {client.contactBy === "text" ? "text message" : "email"}. Take the time, pass,
            or use <strong className="font-bold">Skip {OFFER_WINDOW_MINUTES} min</strong> in the bar at the top to let the offer lapse.
          </>
        ) : (
          <>
            See what happened to this time under{" "}
            <Link href="/practice/cancellations" className="font-bold underline">
              Practice side, Cancellations
            </Link>
            .
          </>
        )}
      </DemoHint>
    </SiteFrame>
  );
}
