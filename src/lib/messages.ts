import { OFFER_WINDOW_MINUTES, PRACTICE, type ContactBy, type Mode } from "./practice";
import { fmtDateTime, fmtDateTimeLong, fmtTime } from "./time";

/**
 * The words of every message the practice sends, written to be safe on a
 * lock screen: a time and a link. No therapist name, and a sender name that
 * does not say what kind of practice this is. Only the confirmation a client
 * has just asked for says whether the visit is in person or by video.
 */

export type Draft = {
  channel: "sms" | "email";
  kind: "booked" | "reminder" | "cancelled" | "offer" | "offer_accepted" | "waitlist_joined";
  subject: string | null;
  body: string;
  /** The page the link in the message opens. */
  link: string | null;
};

type Recipient = { name: string; contactBy: ContactBy };

const firstName = (name: string) => name.trim().split(/\s+/)[0];
const url = (path: string) => `https://${PRACTICE.site}${path}`;
const where = (mode: Mode) => (mode === "video" ? "by video. Your link is on the page below" : "at our office");

function draft(to: Recipient, kind: Draft["kind"], link: string | null, sms: string, email: { subject: string; body: string }): Draft {
  return to.contactBy === "text" ? { channel: "sms", kind, subject: null, body: sms, link } : { channel: "email", kind, link, ...email };
}

export function bookedMessage(to: Recipient, startsAt: Date, mode: Mode, token: string): Draft {
  const link = `/a/${token}`;
  return {
    channel: "email",
    kind: "booked",
    link,
    subject: `Your appointment on ${fmtDateTime(startsAt)}`,
    body: `Hello ${firstName(to.name)},\n\nYour appointment is booked for ${fmtDateTimeLong(startsAt)}, ${where(mode)}.\n\nTo confirm, change or cancel it: ${url(link)}\n\nWe will send a reminder before your appointment.\n\n${PRACTICE.shortName}\n${PRACTICE.phone}`,
  };
}

export function reminderMessage(to: Recipient, startsAt: Date, hoursBefore: number, token: string): Draft {
  const link = `/a/${token}`;
  const when = hoursBefore >= 24 ? `on ${fmtDateTime(startsAt)}` : `today at ${fmtTime(startsAt)}`;
  return draft(to, "reminder", link, `${PRACTICE.shortName}: you have an appointment ${when}. Confirm or cancel: ${url(link)}`, {
    subject: `Reminder: appointment ${when}`,
    body: `Hello ${firstName(to.name)},\n\nThis is a reminder of your appointment ${when}.\n\nConfirm or cancel: ${url(link)}\n\n${PRACTICE.shortName}`,
  });
}

export function cancelledMessage(to: Recipient, startsAt: Date): Draft {
  return draft(to, "cancelled", "/", `${PRACTICE.shortName}: your appointment on ${fmtDateTime(startsAt)} is cancelled. Book another time: ${url("/")}`, {
    subject: `Your appointment on ${fmtDateTime(startsAt)} is cancelled`,
    body: `Hello ${firstName(to.name)},\n\nYour appointment on ${fmtDateTimeLong(startsAt)} has been cancelled.\n\nBook another time: ${url("/")}\n\n${PRACTICE.shortName}\n${PRACTICE.phone}`,
  });
}

export function offerMessage(to: Recipient, startsAt: Date, expiresAt: Date, token: string): Draft {
  const link = `/offer/${token}`;
  return draft(
    to,
    "offer",
    link,
    `${PRACTICE.shortName}: a time has opened on ${fmtDateTime(startsAt)}. It is held for you until ${fmtTime(expiresAt)}. Take it or pass: ${url(link)}`,
    {
      subject: `A time has opened on ${fmtDateTime(startsAt)}`,
      body: `Hello ${firstName(to.name)},\n\nA time has opened on ${fmtDateTimeLong(startsAt)}. You are next on our waitlist, so it is held for you until ${fmtTime(expiresAt)} (${OFFER_WINDOW_MINUTES} minutes).\n\nTake it or pass: ${url(link)}\n\nIf you pass, you keep your place on the waitlist.\n\n${PRACTICE.shortName}`,
    },
  );
}

export function offerAcceptedMessage(to: Recipient, startsAt: Date, token: string): Draft {
  const link = `/a/${token}`;
  return draft(to, "offer_accepted", link, `${PRACTICE.shortName}: you are booked for ${fmtDateTime(startsAt)}. Details: ${url(link)}`, {
    subject: `You are booked for ${fmtDateTime(startsAt)}`,
    body: `Hello ${firstName(to.name)},\n\nYou took the time that opened. You are booked for ${fmtDateTimeLong(startsAt)}.\n\nDetails, and to cancel if you need to: ${url(link)}\n\n${PRACTICE.shortName}`,
  });
}

export function waitlistJoinedMessage(to: Recipient): Draft {
  return {
    channel: "email",
    kind: "waitlist_joined",
    link: null,
    subject: "You are on our waitlist",
    body: `Hello ${firstName(to.name)},\n\nYou are on the ${PRACTICE.shortName} waitlist. When a time that fits what you told us opens up, we will ${to.contactBy === "text" ? "text" : "email"} you. Each offer is held for ${OFFER_WINDOW_MINUTES} minutes before it passes to the next person.\n\n${PRACTICE.shortName}\n${PRACTICE.phone}`,
  };
}
