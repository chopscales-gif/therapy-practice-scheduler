import { and, asc, eq, gte, inArray } from "drizzle-orm";
import { appointments } from "@/db/schema";
import { earliestBookable, sessionsOn } from "@/lib/slots";
import { BOOKING_HORIZON_DAYS } from "@/lib/practice";
import { addDays, dayOf } from "@/lib/time";
import { listTherapists } from "./queries";
import type { BookingRequest, Ctx } from "./workflow";

/**
 * "Try to fool it": bookings the screens never offer, built from the visitor's
 * own sample data and handed to the real workflow, so the refusal a visitor
 * reads is the workflow's own and not a line written for the demo.
 */

export const FOOL_KINDS = ["taken", "past", "video"] as const;
export type FoolKind = (typeof FOOL_KINDS)[number];

/** Someone who is in nobody's calendar, so the only thing wrong with the request is the thing being tried. */
const SOMEONE_NEW = { name: "Riley Tamsin", email: "riley.tamsin@mail.example", phone: "(801) 555-0142", contactBy: "text" } as const;

/** The booking to attempt, or null when the sample data has nothing to try it with. */
export async function foolRequest(ctx: Ctx, kind: FoolKind): Promise<BookingRequest | null> {
  const therapists = await listTherapists(ctx);
  const earliest = earliestBookable(ctx.now);
  const today = dayOf(ctx.now);

  if (kind === "taken") {
    // A time somebody already has, far enough ahead that nothing else is wrong with asking for it.
    const [taken] = await ctx.db
      .select()
      .from(appointments)
      .where(and(eq(appointments.sandboxId, ctx.sandboxId), gte(appointments.startsAt, earliest), inArray(appointments.status, ["booked", "confirmed"])))
      .orderBy(asc(appointments.startsAt))
      .limit(1);
    return taken ? { ...SOMEONE_NEW, therapistId: taken.therapistId, startsAt: taken.startsAt, mode: "office" } : null;
  }

  if (kind === "past") {
    // The latest session that has already begun, with whoever worked it.
    for (let back = 0; back < 14; back++) {
      const day = addDays(today, -back);
      const sessions = therapists
        .flatMap((therapist) => sessionsOn(therapist.hours, day).map((startsAt) => ({ therapistId: therapist.id, startsAt })))
        .filter((session) => session.startsAt <= ctx.now)
        .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
      if (sessions.length) return { ...SOMEONE_NEW, ...sessions[0], mode: "office" };
    }
    return null;
  }

  // Video with a therapist who only works in person.
  const inPersonOnly = therapists.find((therapist) => !therapist.offersVideo);
  if (!inPersonOnly) return null;
  for (let ahead = 0; ahead <= BOOKING_HORIZON_DAYS; ahead++) {
    const startsAt = sessionsOn(inPersonOnly.hours, addDays(today, ahead)).find((session) => session >= earliest);
    if (startsAt) return { ...SOMEONE_NEW, therapistId: inPersonOnly.id, startsAt, mode: "video" };
  }
  return null;
}
