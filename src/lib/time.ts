/**
 * Calendar maths in the practice's time zone. Appointments are stored as
 * instants (UTC); everything a person sees or picks is a wall-clock time in
 * ZONE. Days are moved as calendar dates, never by adding 24 hours, so the two
 * days a year that are 23 or 25 hours long cannot shift an appointment.
 */
export const ZONE = "America/Denver";

/** A calendar date in the practice's time zone. */
export type Day = { y: number; m: number; d: number };

const PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
});

export function localParts(at: Date): Day & { hour: number; minute: number } {
  const parts: Record<string, number> = {};
  for (const part of PARTS.formatToParts(at)) if (part.type !== "literal") parts[part.type] = Number(part.value);
  return { y: parts.year, m: parts.month, d: parts.day, hour: parts.hour, minute: parts.minute };
}

/** Minutes the zone is ahead of UTC at that instant (negative in the Americas). */
function offsetMinutes(at: Date): number {
  const p = localParts(at);
  const wall = Date.UTC(p.y, p.m - 1, p.d, p.hour, p.minute);
  return Math.round((wall - Math.floor(at.getTime() / 60_000) * 60_000) / 60_000);
}

/** The instant at which the practice's clocks read this date and time. */
export function zonedTime(day: Day, hour: number, minute = 0): Date {
  const wall = Date.UTC(day.y, day.m - 1, day.d, hour, minute);
  // Two passes: the first guess can land on the wrong side of a clock change.
  const first = wall - offsetMinutes(new Date(wall)) * 60_000;
  return new Date(wall - offsetMinutes(new Date(first)) * 60_000);
}

export function dayOf(at: Date): Day {
  const { y, m, d } = localParts(at);
  return { y, m, d };
}

export function addDays(day: Day, count: number): Day {
  const moved = new Date(Date.UTC(day.y, day.m - 1, day.d + count));
  return { y: moved.getUTCFullYear(), m: moved.getUTCMonth() + 1, d: moved.getUTCDate() };
}

/** 0 is Sunday, 6 is Saturday. */
export function weekdayOf(day: Day): number {
  return new Date(Date.UTC(day.y, day.m - 1, day.d)).getUTCDay();
}

export function mondayOf(day: Day): Day {
  return addDays(day, -((weekdayOf(day) + 6) % 7));
}

export function dayKey(day: Day): string {
  return `${day.y}-${String(day.m).padStart(2, "0")}-${String(day.d).padStart(2, "0")}`;
}

export function parseDayKey(key: string | undefined): Day | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key ?? "");
  if (!match) return null;
  const day = { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
  // Reject dates that do not exist, such as 2026-02-31.
  return dayKey(addDays(day, 0)) === key ? day : null;
}

export function compareDays(a: Day, b: Day): number {
  return dayKey(a).localeCompare(dayKey(b));
}

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: ZONE, ...options });
const TIME = fmt({ hour: "numeric", minute: "2-digit" });
const DAY = fmt({ weekday: "short", month: "short", day: "numeric" });
const DAY_LONG = fmt({ weekday: "long", month: "long", day: "numeric" });

/** "3:00 PM" */
export const fmtTime = (at: Date) => TIME.format(at);
/** "Tue, Nov 17" */
export const fmtDay = (at: Date) => DAY.format(at);
/** "Tuesday, November 17" */
export const fmtDayLong = (at: Date) => DAY_LONG.format(at);
/** "Tue, Nov 17 at 3:00 PM" */
export const fmtDateTime = (at: Date) => `${fmtDay(at)} at ${fmtTime(at)}`;
/** "Tuesday, November 17 at 3:00 PM" */
export const fmtDateTimeLong = (at: Date) => `${fmtDayLong(at)} at ${fmtTime(at)}`;

export function minutesBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 60_000);
}

/** "1 minute", "20 minutes" */
export const countOf = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}
