import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { fmtDateTime } from "@/lib/time";
import { outboxFor } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "Outbox" };

const KIND = {
  booked: "Booking confirmation",
  reminder: "Reminder",
  cancelled: "Cancellation notice",
  offer: "Waitlist offer",
  offer_accepted: "Waitlist booking",
  waitlist_joined: "Waitlist confirmation",
};

export default async function OutboxPage() {
  const ctx = await getCtx();
  const messages = await outboxFor(ctx);

  return (
    <>
      <PageHeader title="Outbox">
        Every text message and email the system would have sent, newest first. Nothing leaves this demo. Text messages give a time and a link and
        never say what the appointment is for, so they are safe to arrive on a lock screen.
      </PageHeader>
      <ul className="max-w-[68rem] border-t-2 border-ink">
        {messages.map((message) => (
          <li key={message.id} className="grid grid-cols-[minmax(0,1fr)] gap-x-10 gap-y-3 border-b border-rule py-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
            <div>
              <p className="font-display text-xl font-medium leading-tight">{KIND[message.kind]}</p>
              <p className="mt-1 text-[0.9375rem]">
                By {message.channel === "sms" ? "text" : "email"} to {message.recipientName}
              </p>
              <p className="break-all text-[0.875rem] text-muted">{message.recipient}</p>
              <p className="mt-1 text-[0.875rem] tabular-nums text-muted">{fmtDateTime(message.createdAt)}</p>
            </div>
            <div className="max-w-[40rem]">
            {message.subject && <p className="mb-2 font-semibold">{message.subject}</p>}
            <p className={`whitespace-pre-line [overflow-wrap:anywhere] leading-relaxed ${message.channel === "sms" ? "max-w-md rounded-2xl rounded-bl-sm border border-line bg-surface px-4 py-2.5" : ""}`}>
              {message.body}
            </p>
            {message.link && (
              <Link href={message.link} className="mt-1 inline-flex min-h-11 items-center font-semibold text-accent underline">
                Open the link in this message
              </Link>
            )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
