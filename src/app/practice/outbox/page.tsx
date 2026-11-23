import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Pill } from "@/components/ui";
import { fmtDateTime } from "@/lib/time";
import type { Tone } from "@/lib/tones";
import { outboxFor } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "Outbox" };

const KIND: Record<string, { label: string; is: Tone }> = {
  booked: { label: "Booking confirmation", is: "good" },
  reminder: { label: "Reminder", is: "waiting" },
  cancelled: { label: "Cancellation notice", is: "gone" },
  offer: { label: "Waitlist offer", is: "waitlist" },
  offer_accepted: { label: "Waitlist booking", is: "waitlist" },
  waitlist_joined: { label: "Waitlist confirmation", is: "waitlist" },
};

export default async function OutboxPage() {
  const ctx = await getCtx();
  const messages = await outboxFor(ctx);

  return (
    <>
      <PageHeader title="Outbox">
        Every text message and email the system would have sent, newest first. <strong className="font-bold text-ink">Nothing leaves this demo.</strong> Text
        messages give a time and a link and never say what the appointment is for, so they are safe to arrive on a lock screen.
      </PageHeader>
      {messages.length === 0 && <p className="panel max-w-[44rem] px-5 py-4 text-ink-soft">No messages yet. Book or cancel an appointment and what would be sent appears here.</p>}
      <ul className="grid max-w-[72rem] gap-2.5">
        {messages.map((message) => (
          <li key={message.id} className="panel grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-3 px-4 py-4 sm:px-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
            <div>
              <Pill is={KIND[message.kind].is}>{KIND[message.kind].label}</Pill>
              <p className="eyebrow mt-3">{message.channel === "sms" ? "Text to" : "Email to"}</p>
              <p className="font-bold leading-snug">{message.recipientName}</p>
              <p className="break-all text-[0.875rem] text-muted">{message.recipient}</p>
              <p className="mt-1 text-[0.875rem] font-bold tabular-nums text-muted">{fmtDateTime(message.createdAt)}</p>
            </div>
            <div className="max-w-[40rem]">
              {message.subject && <p className="mb-2 font-bold">{message.subject}</p>}
              <p
                className={`whitespace-pre-line [overflow-wrap:anywhere] leading-relaxed ${
                  message.channel === "sms" ? "max-w-md rounded-2xl rounded-bl-sm bg-desk px-4 py-2.5" : "rounded-xl border border-line bg-paper px-4 py-3"
                }`}
              >
                {message.body}
              </p>
              {message.link && (
                <Link href={message.link} className="mt-1 inline-flex min-h-11 items-center font-bold text-accent underline">
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
