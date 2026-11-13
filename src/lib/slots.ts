import { BOOKING_HORIZON_DAYS, BOOKING_LEAD_HOURS } from "./practice";
import { addDays, dayOf, localParts, weekdayOf, zonedTime, type Day } from "./time";

/** Session start hours for each weekday (1 is Monday). */
export type Hours = Record<string, number[]>;

export const slotKey = (therapistId: string, startsAt: Date) => `${therapistId}|${startsAt.toISOString()}`;

/** Every session start a therapist works on one calendar day. */
export function sessionsOn(hours: Hours, day: Day): Date[] {
  return (hours[String(weekdayOf(day))] ?? []).map((hour) => zonedTime(day, hour));
}

/** True when this instant is the start of one of the therapist's working sessions. */
export function isSessionStart(hours: Hours, at: Date): boolean {
  const local = localParts(at);
  if (local.minute !== 0 || at.getTime() % 60_000 !== 0) return false;
  return (hours[String(weekdayOf(local))] ?? []).includes(local.hour);
}

export function earliestBookable(now: Date): Date {
  return new Date(now.getTime() + BOOKING_LEAD_HOURS * 3_600_000);
}

/** The first calendar day that is past the booking horizon. */
export function horizonEnd(now: Date): Day {
  return addDays(dayOf(now), BOOKING_HORIZON_DAYS + 1);
}

export type OpenSlot = { therapistId: string; startsAt: Date };

/**
 * The times a client can book online: working sessions that are not taken,
 * not being held for the waitlist, far enough ahead, and inside the horizon.
 */
export function openSlots(therapists: { id: string; hours: Hours }[], unavailable: Set<string>, now: Date): OpenSlot[] {
  const earliest = earliestBookable(now);
  const today = dayOf(now);
  const slots: OpenSlot[] = [];
  for (let offset = 0; offset <= BOOKING_HORIZON_DAYS; offset++) {
    const day = addDays(today, offset);
    for (const therapist of therapists) {
      for (const startsAt of sessionsOn(therapist.hours, day)) {
        if (startsAt < earliest || unavailable.has(slotKey(therapist.id, startsAt))) continue;
        slots.push({ therapistId: therapist.id, startsAt });
      }
    }
  }
  return slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}
