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
      <ul className="grid max-w-3xl gap-3">
        {messages.map((message) => (
          <li key={message.id} className="panel px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="font-semibold">
                {KIND[message.kind]}{" "}
                <span className="font-normal text-muted">
                  by {message.channel === "sms" ? "text" : "email"} to {message.recipientName}
                </span>
              </p>
              <p className="text-[0.8125rem] tabular-nums text-muted">{fmtDateTime(message.createdAt)}</p>
            </div>
            <p className="text-[0.8125rem] text-muted">{message.recipient}</p>
            {message.subject && <p className="mt-2 font-semibold">{message.subject}</p>}
            <p className={`mt-2 whitespace-pre-line break-words leading-relaxed ${message.channel === "sms" ? "max-w-md rounded-2xl rounded-bl-sm bg-paper px-4 py-2.5" : ""}`}>
              {message.body}
            </p>
            {message.link && (
              <Link href={message.link} className="mt-2 inline-block font-semibold text-accent underline">
                Open the link in this message
              </Link>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
