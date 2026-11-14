/** The fictional practice and the scheduling rules it runs on. A real practice would set these itself. */
export const PRACTICE = {
  name: "Larkspur Counseling",
  /** Used in text messages, which never say what kind of practice this is. */
  shortName: "Larkspur",
  city: "Salt Lake City, Utah",
  phone: "(801) 555-0142",
  site: "larkspur.example",
};

/** The number the booking form is filled in with, so nobody types their own into a demo. */
export const SAMPLE_VISITOR_PHONE = "(801) 555-0117";

export const SESSION_MINUTES = 50;
/** Online booking closes this long before a session starts. */
export const BOOKING_LEAD_HOURS = 2;
/** How far ahead a client can book online. */
export const BOOKING_HORIZON_DAYS = 21;
/** How long an opened slot is held for one waitlisted client before it passes to the next. */
export const OFFER_WINDOW_MINUTES = 20;
/** Closer to the session than this, an opening is no longer offered to the waitlist. */
export const OFFER_CUTOFF_HOURS = 2;
/** Reminders go out this many hours before a session. */
export const REMINDER_HOURS = [48, 2] as const;

export type Mode = "office" | "video";
export type ModePreference = Mode | "either";
export type PartOfDay = "morning" | "afternoon" | "evening";
export type ContactBy = "text" | "email";

export const PARTS_OF_DAY: { key: PartOfDay; label: string; hint: string }[] = [
  { key: "morning", label: "Mornings", hint: "before noon" },
  { key: "afternoon", label: "Afternoons", hint: "noon to 5" },
  { key: "evening", label: "Evenings", hint: "5 and later" },
];

export function partOfDay(hour: number): PartOfDay {
  if (hour < 12) return "morning";
  return hour < 17 ? "afternoon" : "evening";
}

export const MODE_LABEL: Record<Mode, string> = { office: "In person", video: "Video" };
