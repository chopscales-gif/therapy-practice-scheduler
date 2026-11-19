import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/action-button";
import { AppointmentChip, Fact, Pill } from "@/components/ui";
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
    <div className="max-w-[72rem]">
      <Link href={`/practice?t=${therapist.id}&w=${dayKey(mondayOf(dayOf(appointment.startsAt)))}`} className="inline-flex min-h-11 items-center font-bold text-accent underline">
        Back to the calendar
      </Link>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="font-display text-[2.25rem] font-medium leading-[1.05] tracking-[-0.01em] text-dusk lg:text-[2.6rem]">{client.name}</h1>
        <AppointmentChip status={appointment.status} />
      </div>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-2">
        <div className="grid gap-5">
          <section className="panel px-5 py-4">
            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <Fact label="When">{fmtDateTimeLong(appointment.startsAt)}</Fact>
              <Fact label="With">
                {therapist.name}
                <span className="block text-[0.9375rem] font-normal text-ink-soft">{MODE_LABEL[appointment.mode]}</span>
              </Fact>
              <Fact label="Contact">
                {client.phone}
                <span className="block break-all text-[0.9375rem] font-normal text-ink-soft">{client.email}</span>
                <span className="block text-[0.875rem] font-normal text-muted">Prefers {client.contactBy === "text" ? "text messages" : "email"}</span>
              </Fact>
              <Fact label="How it was booked">
                {SOURCE[appointment.source]}
                <span className="block text-[0.875rem] font-normal text-muted">{fmtDateTime(appointment.createdAt)}</span>
              </Fact>
            </dl>
          </section>

          <section className="panel px-5 py-4">
            <h2 className="eyebrow">Reminders</h2>
            <ul className="mt-1 divide-y divide-line">
              {reminders.map((reminder) => (
                <li key={reminder.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
                  <span>
                    <strong className="font-bold">{reminder.hoursBefore} hours before</strong>, {fmtDateTime(reminder.dueAt)}
                  </span>
                  {reminder.status === "sent" ? (
                    <Pill is="good">Sent</Pill>
                  ) : reminder.status === "cancelled" ? (
                    <Pill is="gone">Not sent, cancelled</Pill>
                  ) : (
                    <Pill is="open">Scheduled</Pill>
                  )}
                </li>
              ))}
              {reminders.length === 0 && <li className="py-2.5 text-muted">No reminders for this appointment.</li>}
            </ul>
          </section>

          {opening && (
            <p className="panel border-l-[6px] !border-l-flag px-5 py-4 leading-relaxed">
              <strong className="font-bold">Cancelled {appointment.cancelledAt ? fmtDateTime(appointment.cancelledAt) : ""}.</strong>{" "}
              <Link href={`/practice/cancellations#${opening.id}`} className="font-bold text-accent underline">
                See what happened to the time
              </Link>
              .
            </p>
          )}
        </div>

      {preview && (
        <section className="panel border-t-[6px] !border-t-accent px-5 py-4">
          <h2 className="font-display text-2xl font-medium text-dusk">If this is cancelled</h2>
          {preview.tooLate ? (
            <p className="mt-2 max-w-[65ch] leading-relaxed text-ink-soft">
              It is less than {OFFER_CUTOFF_HOURS} hours away, too late to offer to the waitlist. The time would simply open for the front desk to fill.
            </p>
          ) : preview.eligible.length === 0 ? (
            <p className="mt-2 max-w-[65ch] leading-relaxed text-ink-soft">Nobody on the waitlist fits this time, so it would open for online booking straight away.</p>
          ) : (
            <>
              <p className="mt-2 max-w-[65ch] leading-relaxed text-ink-soft">
                The time is offered to these waitlisted clients in this order, one at a time. Each has {OFFER_WINDOW_MINUTES} minutes to take it before it
                passes on.
              </p>
              <ol className="mt-3 divide-y divide-line rounded-[0.375rem] border border-line bg-paper">
                {preview.eligible.map((verdict, index) => (
                  <li key={verdict.candidate.entryId} className="flex flex-wrap items-baseline gap-x-4 px-4 py-3">
                    <span className="w-5 font-display text-xl font-medium text-accent">{index + 1}</span>
                    <span className="flex-1 font-bold">{verdict.candidate.clientName}</span>
                    <span className="text-muted">{verdict.reason}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
          {!preview.tooLate && preview.skipped.length > 0 && (
            <details className="group mt-3 border-y border-line">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 font-bold text-accent [&::-webkit-details-marker]:hidden">
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
                    <span className="font-bold">{verdict.candidate.clientName}:</span> <span className="text-muted">{verdict.reason}</span>
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
