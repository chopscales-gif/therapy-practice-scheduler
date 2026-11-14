import { OFFER_CUTOFF_HOURS } from "./practice";
import { fmtTime, minutesBetween } from "./time";

/** The wording of each line in an opening's timeline. */

const by = (channel: "sms" | "email") => (channel === "sms" ? "text" : "email");

export const story = {
  cancelled: (clientName: string, who: "client" | "practice") =>
    who === "client" ? `${clientName} cancelled from their appointment link.` : `${clientName} cancelled. The front desk recorded it.`,
  offered: (clientName: string, channel: "sms" | "email", expiresAt: Date) =>
    `Offered to ${clientName} by ${by(channel)}. Held for them until ${fmtTime(expiresAt)}.`,
  expired: (clientName: string, expiresAt: Date) => `No answer from ${clientName} by ${fmtTime(expiresAt)}. They keep their place on the waitlist.`,
  declined: (clientName: string) => `${clientName} passed. They keep their place on the waitlist.`,
  accepted: (clientName: string, sentAt: Date, acceptedAt: Date) => {
    const minutes = minutesBetween(sentAt, acceptedAt);
    return `${clientName} took it ${minutes < 1 ? "straight away" : `after ${minutes} minute${minutes === 1 ? "" : "s"}`}. The time is filled.`;
  },
  noOne: (offersMade: number) =>
    offersMade === 0
      ? "No one on the waitlist fits this time. It is open for online booking."
      : "No one else on the waitlist fits this time. It is open for online booking.",
  tooLate: (offersMade: number) =>
    `Less than ${OFFER_CUTOFF_HOURS} hours to go, ${offersMade === 0 ? "too late to offer it to the waitlist" : "so no more offers go out"}. The front desk can still fill it by phone.`,
};
