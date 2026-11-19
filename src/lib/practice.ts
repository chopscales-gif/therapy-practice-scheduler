/** The practice whose name is on the screens and in the messages. */
export type Practice = {
  name: string;
  /** Used in text messages. The fictional practice's short name does not say what kind of practice it is. */
  shortName: string;
  city: string;
  phone: string;
  site: string;
  /** True when a visitor typed this name in. It is then never described as fictional. */
  custom: boolean;
};

/** The fictional practice and the scheduling rules it runs on. A real practice would set these itself. */
export const DEMO_PRACTICE: Practice = {
  name: "Larkspur Counseling",
  shortName: "Larkspur",
  city: "Salt Lake City, Utah",
  phone: "(801) 555-0142",
  site: "larkspur.example",
  custom: false,
};

/** The sample data is always written under the fictional practice's name. */
export const PRACTICE = DEMO_PRACTICE;

/**
 * The practice to show for a sandbox. A visitor's own name goes on the screens
 * and on messages written from then on. The phone number and web address stay
 * placeholders, so nothing on the page can be mistaken for their real ones.
 */
export function practiceFor(customName: string | null): Practice {
  if (!customName) return DEMO_PRACTICE;
  return { name: customName, shortName: customName, city: "", phone: DEMO_PRACTICE.phone, site: "yourpractice.example", custom: true };
}

export const PRACTICE_NAME_MIN = 2;
export const PRACTICE_NAME_MAX = 60;
const PRACTICE_NAME_CHARACTERS = /^[A-Za-z0-9À-ÖØ-öø-ÿ &',.()/+-]+$/;

export type PracticeNameResult = { ok: true; name: string } | { ok: false; error: string };

/** Tidies and checks a practice name a visitor typed. Plain text only. */
export function cleanPracticeName(raw: string): PracticeNameResult {
  const name = raw
    .normalize("NFC")
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  if (name.length < PRACTICE_NAME_MIN || name.length > PRACTICE_NAME_MAX) {
    return { ok: false, error: `Use between ${PRACTICE_NAME_MIN} and ${PRACTICE_NAME_MAX} characters.` };
  }
  if (!PRACTICE_NAME_CHARACTERS.test(name) || !/[A-Za-z0-9À-ÖØ-öø-ÿ]/.test(name)) {
    return { ok: false, error: "Use letters, numbers, spaces and & ' , . - ( ) only." };
  }
  return { ok: true, name };
}

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
