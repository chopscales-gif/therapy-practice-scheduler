import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/action-button";
import { AppointmentCard, DemoHint, SiteFrame } from "@/components/site";
import { MODE_LABEL, REMINDER_HOURS, SESSION_MINUTES } from "@/lib/practice";
import { fmtDayLong, fmtTime } from "@/lib/time";
import { tone } from "@/lib/tones";
import { cancelByTokenAction, confirmAction } from "@/server/actions";
import { appointmentByToken } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "Your appointment" };

const TITLE = {
  booked: ["Your appointment", "is booked."],
  confirmed: ["You are", "confirmed."],
  cancelled: ["This appointment", "is cancelled."],
  completed: ["This appointment", "has passed."],
};

export default async function AppointmentPage({ params }: PageProps<"/a/[token]">) {
  const { token } = await params;
  const ctx = await getCtx();
  const view = await appointmentByToken(ctx, token);
  if (!view) notFound();
  const { appointment, therapist, client } = view;
  const upcoming = appointment.startsAt > ctx.now;
  const active = appointment.status === "booked" || appointment.status === "confirmed";
  const cancelled = appointment.status === "cancelled";
  const [lead, picked] = TITLE[appointment.status];

  return (
    <SiteFrame
      greeting={`Hello ${client.name.split(" ")[0]},`}
      title={
        <>
          {lead} <em className={cancelled ? "!text-flag" : ""}>{picked}</em>
        </>
      }
      card={
        <AppointmentCard
          story="appointment"
          heading={cancelled ? "Cancelled" : "Your appointment"}
          lines={[
            { label: "Day", value: fmtDayLong(appointment.startsAt), struck: cancelled },
            { label: "Time", value: fmtTime(appointment.startsAt), note: `${SESSION_MINUTES} minutes, Mountain Time`, struck: cancelled },
            { label: "With", value: therapist.name, note: therapist.credentials },
            { label: "Where", value: MODE_LABEL[appointment.mode] },
          ]}
        />
      }
    >
      {active && upcoming && (
        <section className="max-w-[44rem]">
          {appointment.status === "booked" ? (
            <p>
              <span className="pill" style={tone("waiting")}>
                Not confirmed yet
              </span>
            </p>
          ) : (
            <p data-story="confirmed" className="arrive inline-block">
              <span className="pill" style={tone("good")}>
                Confirmed
              </span>
            </p>
          )}
          <h2 className="mt-3 font-display text-[1.7rem] font-medium leading-tight text-dusk">
            {appointment.status === "booked" ? "Let us know you are coming" : "See you then"}
          </h2>
          <p className="mt-2 text-[1.0625rem] leading-relaxed text-ink-soft">
            {appointment.status === "booked"
              ? "Confirming takes one tap. If you cannot make it, cancelling here frees the time for someone on the waitlist."
              : "Nothing more is needed. If your plans change, cancelling here frees the time for someone on the waitlist."}
          </p>
          {appointment.mode === "video" && (
            <p className="mt-3 leading-relaxed text-ink-soft">
              You join from this page: a button to start the video session appears here shortly before your time. No video service is connected in
              this demo.
            </p>
          )}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start">
            {appointment.status === "booked" && (
              <ActionButton story="confirm" action={confirmAction.bind(null, token)} pendingLabel="Confirming">
                Confirm I will be there
              </ActionButton>
            )}
            <ActionButton action={cancelByTokenAction.bind(null, token)} pendingLabel="Cancelling" variant="danger">
              Cancel this appointment
            </ActionButton>
          </div>
          <p className="mt-8 border-t border-line pt-4 text-[0.9375rem] leading-relaxed text-muted">
            Reminders go out {REMINDER_HOURS[0]} hours and {REMINDER_HOURS[1]} hours before, with a link back to this page. Need a different time? Call{" "}
            <span className="whitespace-nowrap">{ctx.practice.phone}</span>.
          </p>
        </section>
      )}

      {!(active && upcoming) && (
        <p className="max-w-[44rem] text-[1.0625rem] leading-relaxed">
          {cancelled && "Nothing more is needed from you. "}
          <Link href="/" className="font-bold text-accent underline">
            Book another time
          </Link>{" "}
          whenever you are ready, or call <span className="whitespace-nowrap">{ctx.practice.phone}</span>.
        </p>
      )}

      <DemoHint className="mt-10">
        {cancelled ? (
          <>
            The time you gave up went straight to the waitlist. See what happened to it under{" "}
            <Link href="/practice/cancellations" className="font-bold underline">
              Practice side, Cancellations
            </Link>
            .
          </>
        ) : (
          <>
            This is the page a client reaches from the link in their confirmation and reminders. The messages themselves are in{" "}
            <Link href="/practice/outbox" className="font-bold underline">
              Practice side, Outbox
            </Link>
            . Cancel here and the waitlist is offered the time straight away.
          </>
        )}
      </DemoHint>
    </SiteFrame>
  );
}
