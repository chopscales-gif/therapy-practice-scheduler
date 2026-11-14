import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/action-button";
import { DemoHint, SiteFrame } from "@/components/site";
import { MODE_LABEL, PRACTICE, SESSION_MINUTES } from "@/lib/practice";
import { fmtDateTimeLong } from "@/lib/time";
import { cancelByTokenAction, confirmAction } from "@/server/actions";
import { appointmentByToken } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "Your appointment" };

export default async function AppointmentPage({ params }: PageProps<"/a/[token]">) {
  const { token } = await params;
  const ctx = await getCtx();
  const view = await appointmentByToken(ctx, token);
  if (!view) notFound();
  const { appointment, therapist } = view;
  const upcoming = appointment.startsAt > ctx.now;
  const active = appointment.status === "booked" || appointment.status === "confirmed";

  return (
    <SiteFrame>
      <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight">
        {appointment.status === "cancelled" ? "This appointment is cancelled" : appointment.status === "completed" ? "This appointment has passed" : appointment.status === "confirmed" ? "You are confirmed" : "Your appointment is booked"}
      </h1>

      <dl className="panel mt-6 grid gap-x-8 gap-y-4 px-5 py-5 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted">When</dt>
          <dd className={`mt-0.5 text-lg font-semibold ${appointment.status === "cancelled" ? "line-through decoration-flag" : ""}`}>{fmtDateTimeLong(appointment.startsAt)}</dd>
          <dd className="text-sm text-muted">{SESSION_MINUTES} minutes, Mountain Time</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">With</dt>
          <dd className="mt-0.5 text-lg font-semibold">
            {therapist.name}, {therapist.credentials}
          </dd>
          <dd className="text-sm text-muted">{MODE_LABEL[appointment.mode]}</dd>
        </div>
      </dl>

      {active && upcoming && appointment.mode === "video" && (
        <p className="mt-5 leading-relaxed text-ink-soft">
          You join from this page: a button to start the video session appears here shortly before your time. No video service is connected in this
          demo.
        </p>
      )}

      {active && upcoming && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start">
          {appointment.status === "booked" && (
            <ActionButton action={confirmAction.bind(null, token)} pendingLabel="Confirming">
              Confirm I will be there
            </ActionButton>
          )}
          <ActionButton action={cancelByTokenAction.bind(null, token)} pendingLabel="Cancelling" variant="danger">
            Cancel this appointment
          </ActionButton>
        </div>
      )}

      {appointment.status === "cancelled" && (
        <p className="mt-6 leading-relaxed">
          Nothing more is needed from you. <Link href="/" className="font-semibold text-accent underline">Book another time</Link> whenever you are ready, or
          call {PRACTICE.phone}.
        </p>
      )}

      <DemoHint className="mt-10">
        {appointment.status === "cancelled" ? (
          <>
            The time you gave up went straight to the waitlist. See what happened to it under{" "}
            <Link href="/practice/cancellations" className="font-semibold underline">Practice side, Cancellations</Link>.
          </>
        ) : (
          <>
            This is the page a client reaches from the link in their confirmation and reminders. The messages themselves are in{" "}
            <Link href="/practice/outbox" className="font-semibold underline">Practice side, Outbox</Link>. Cancel here and the waitlist is offered the time
            straight away.
          </>
        )}
      </DemoHint>
    </SiteFrame>
  );
}
