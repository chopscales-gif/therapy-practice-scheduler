import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/action-button";
import { AppointmentChip } from "@/components/ui";
import { MODE_LABEL, OFFER_CUTOFF_HOURS, OFFER_WINDOW_MINUTES } from "@/lib/practice";
import { dayKey, dayOf, fmtDateTime, fmtDateTimeLong, mondayOf } from "@/lib/time";
import { cancelAction } from "@/server/actions";
import { appointmentById, openingForCancelled, remindersFor } from "@/server/queries";
import { getCtx } from "@/server/session";
import { previewCancellation } from "@/server/workflow";

export const metadata: Metadata = { title: "Appointment" };

const SOURCE = { online: "Booked online by the client", front_desk: "Booked by the front desk", waitlist: "Filled from the waitlist" };

export default async function AppointmentDetailPage({ params }: PageProps<"/practice/appointments/[id]">) {
  const { id } = await params;
  const ctx = await getCtx();
  const view = /^[0-9a-f-]{36}$/.test(id) ? await appointmentById(ctx, id) : null;
  if (!view) notFound();
  const { appointment, client, therapist } = view;
  const cancellable = (appointment.status === "booked" || appointment.status === "confirmed") && appointment.startsAt > ctx.now;
  const [reminders, preview, opening] = await Promise.all([
    remindersFor(ctx, appointment.id),
    cancellable ? previewCancellation(ctx, appointment) : null,
    appointment.status === "cancelled" ? openingForCancelled(ctx, appointment.id) : null,
  ]);

  return (
    <div className="max-w-3xl">
      <Link href={`/practice?t=${therapist.id}&w=${dayKey(mondayOf(dayOf(appointment.startsAt)))}`} className="font-semibold text-accent underline">
        Back to the calendar
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight">{client.name}</h1>
        <AppointmentChip status={appointment.status} />
      </div>
      <p className="mt-1 text-lg">
        {fmtDateTimeLong(appointment.startsAt)} with {therapist.name}, {MODE_LABEL[appointment.mode].toLowerCase()}
      </p>

      <dl className="panel mt-6 grid gap-x-8 gap-y-4 px-5 py-5 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted">Contact</dt>
          <dd className="mt-0.5">{client.phone}</dd>
          <dd className="break-all">{client.email}</dd>
          <dd className="text-sm text-muted">Prefers {client.contactBy === "text" ? "text messages" : "email"}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">How it was booked</dt>
          <dd className="mt-0.5">{SOURCE[appointment.source]}</dd>
          <dd className="text-sm text-muted">{fmtDateTime(appointment.createdAt)}</dd>
        </div>
      </dl>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold tracking-tight">Reminders</h2>
        <ul className="panel mt-3 divide-y divide-line">
          {reminders.map((reminder) => (
            <li key={reminder.id} className="flex flex-wrap items-baseline justify-between gap-x-4 px-5 py-3">
              <span>
                {reminder.hoursBefore} hours before, {fmtDateTime(reminder.dueAt)}
              </span>
              <span className={reminder.status === "sent" ? "font-semibold text-good" : "text-muted"}>
                {reminder.status === "sent" ? "Sent" : reminder.status === "cancelled" ? "Not sent, appointment cancelled" : "Scheduled"}
              </span>
            </li>
          ))}
          {reminders.length === 0 && <li className="px-5 py-3 text-muted">No reminders for this appointment.</li>}
        </ul>
      </section>

      {opening && (
        <p className="mt-8 leading-relaxed">
          Cancelled {appointment.cancelledAt ? fmtDateTime(appointment.cancelledAt) : ""}.{" "}
          <Link href={`/practice/cancellations#${opening.id}`} className="font-semibold text-accent underline">
            See what happened to the time
          </Link>
          .
        </p>
      )}

      {preview && (
        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold tracking-tight">If this is cancelled</h2>
          {preview.tooLate ? (
            <p className="mt-2 max-w-[65ch] leading-relaxed text-muted">
              It is less than {OFFER_CUTOFF_HOURS} hours away, too late to offer to the waitlist. The time would simply open for the front desk to fill.
            </p>
          ) : preview.eligible.length === 0 ? (
            <p className="mt-2 max-w-[65ch] leading-relaxed text-muted">Nobody on the waitlist fits this time, so it would open for online booking straight away.</p>
          ) : (
            <>
              <p className="mt-2 max-w-[65ch] leading-relaxed text-muted">
                The time is offered to these waitlisted clients in this order, one at a time. Each has {OFFER_WINDOW_MINUTES} minutes to take it before it
                passes on.
              </p>
              <ol className="panel mt-3 divide-y divide-line">
                {preview.eligible.map((verdict, index) => (
                  <li key={verdict.candidate.entryId} className="flex items-baseline gap-4 px-5 py-3">
                    <span className="w-5 font-display font-semibold tabular-nums text-accent">{index + 1}</span>
                    <span className="flex-1 font-semibold">{verdict.candidate.clientName}</span>
                    <span className="text-muted">{verdict.reason}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
          {!preview.tooLate && preview.skipped.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer font-semibold text-accent">
                {preview.skipped.length} on the waitlist would be skipped, and why
              </summary>
              <ul className="mt-2 grid gap-1 text-[0.9375rem]">
                {preview.skipped.map((verdict) => (
                  <li key={verdict.candidate.entryId}>
                    <span className="font-semibold">{verdict.candidate.clientName}:</span> <span className="text-muted">{verdict.reason}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
          <ActionButton action={cancelAction.bind(null, appointment.id)} pendingLabel="Cancelling" variant="danger" className="mt-5">
            Cancel this appointment
          </ActionButton>
        </section>
      )}
    </div>
  );
}
