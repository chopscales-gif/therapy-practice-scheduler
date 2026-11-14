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
    <div className="max-w-[68rem]">
      <Link href={`/practice?t=${therapist.id}&w=${dayKey(mondayOf(dayOf(appointment.startsAt)))}`} className="inline-flex min-h-11 items-center font-semibold text-accent underline">
        Back to the calendar
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="font-display text-[2.25rem] font-medium leading-[1.1] tracking-[-0.01em] lg:text-[2.625rem]">{client.name}</h1>
        <AppointmentChip status={appointment.status} />
      </div>
      <p className="mt-2 text-lg">
        {fmtDateTimeLong(appointment.startsAt)} with {therapist.name}, {MODE_LABEL[appointment.mode].toLowerCase()}
      </p>

      <div className="mt-8 grid gap-x-12 gap-y-10 xl:grid-cols-2">
      <div>
      <dl className="grid gap-x-8 gap-y-4 border-t-2 border-ink pt-4 sm:grid-cols-2">
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
        <h2 className="font-display text-2xl font-medium">Reminders</h2>
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

      </div>

      {preview && (
        <section className="border-t-2 border-ink pt-4">
          <h2 className="font-display text-2xl font-medium">If this is cancelled</h2>
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
                    <span className="w-5 font-display text-lg italic text-muted">{index + 1}</span>
                    <span className="flex-1 font-semibold">{verdict.candidate.clientName}</span>
                    <span className="text-muted">{verdict.reason}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
          {!preview.tooLate && preview.skipped.length > 0 && (
            <details className="group mt-3 border-y border-line">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 font-semibold text-accent [&::-webkit-details-marker]:hidden">
                <span>
                  {preview.skipped.length} on the waitlist would be skipped, and why
                </span>
                <span className="flex shrink-0 items-center gap-2 text-sm font-medium text-muted">
                  <span className="group-open:hidden">Show</span>
                  <span className="hidden group-open:inline">Hide</span>
                  <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4 text-accent transition-transform group-open:rotate-180 motion-reduce:transition-none" fill="none">
                    <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </summary>
              <ul className="grid gap-1 pb-3 text-[0.9375rem]">
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
    </div>
  );
}
