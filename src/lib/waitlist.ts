import { partOfDay, PARTS_OF_DAY, type ModePreference, type PartOfDay } from "./practice";
import { daysBetween, localParts, weekdayOf, WEEKDAYS } from "./time";

/**
 * Who gets offered a slot that has opened. Written rules, no scoring model:
 * everyone whose stated preferences fit the slot, longest wait first. Each
 * verdict carries its reason, so the front desk can see why.
 */

export type Candidate = {
  entryId: string;
  clientId: string;
  clientName: string;
  /** Null means any therapist. */
  therapistId: string | null;
  days: number[];
  parts: PartOfDay[];
  mode: ModePreference;
  joinedAt: Date;
};

export type OpenedSlot = {
  therapistId: string;
  therapistName: string;
  therapistOffersVideo: boolean;
  startsAt: Date;
};

export type Circumstances = {
  now: Date;
  /** Clients who already have an appointment at this time. */
  busyClientIds: Set<string>;
  /** Waitlist entries that have already had their turn at this opening. */
  alreadyOffered: Set<string>;
  /** Waitlist entries with an offer out for some other opening. Nobody is asked to juggle two at once. */
  holdingAnotherOffer: Set<string>;
  /** The client whose cancellation opened the slot. */
  cancelledByClientId: string | null;
};

export type Verdict = { candidate: Candidate; eligible: boolean; reason: string };

export function waitingDays(joinedAt: Date, now: Date): number {
  return Math.max(0, daysBetween(joinedAt, now));
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

function whyNot(candidate: Candidate, slot: OpenedSlot, facts: Circumstances): string | null {
  const local = localParts(slot.startsAt);
  const part = partOfDay(local.hour);
  if (candidate.clientId === facts.cancelledByClientId) return "Cancelled this appointment";
  if (facts.alreadyOffered.has(candidate.entryId)) return "Already had a turn at this opening";
  if (candidate.therapistId && candidate.therapistId !== slot.therapistId) return "Asked for a different therapist";
  if (!candidate.days.includes(weekdayOf(local))) return `Did not list ${WEEKDAYS[weekdayOf(local)]}s`;
  if (!candidate.parts.includes(part)) return `Did not list ${PARTS_OF_DAY.find((p) => p.key === part)!.label.toLowerCase()}`;
  if (candidate.mode === "video" && !slot.therapistOffersVideo) return `Wants video, which ${slot.therapistName} does not offer`;
  if (facts.busyClientIds.has(candidate.clientId)) return "Already has an appointment at this time";
  if (facts.holdingAnotherOffer.has(candidate.entryId)) return "Is being offered another time right now";
  return null;
}

/** Everyone on the waitlist, split into who would be offered the slot (in order) and who would not. */
export function rankCandidates(slot: OpenedSlot, waiting: Candidate[], facts: Circumstances): { eligible: Verdict[]; skipped: Verdict[] } {
  const eligible: Verdict[] = [];
  const skipped: Verdict[] = [];
  // Longest wait first; the id breaks ties so the order never depends on the database.
  const inOrder = [...waiting].sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime() || a.entryId.localeCompare(b.entryId));
  for (const candidate of inOrder) {
    const reason = whyNot(candidate, slot, facts);
    if (reason) skipped.push({ candidate, eligible: false, reason });
    else eligible.push({ candidate, eligible: true, reason: `Waiting ${plural(waitingDays(candidate.joinedAt, facts.now), "day")}` });
  }
  return { eligible, skipped };
}

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "Tue, Thu" or "Any weekday" */
export function describeDays(days: number[]): string {
  const sorted = [...new Set(days)].sort();
  return sorted.length >= 5 ? "Any weekday" : sorted.map((day) => SHORT_DAYS[day]).join(", ");
}

/** "Afternoons, evenings" or "Any time" */
export function describeParts(parts: PartOfDay[]): string {
  if (parts.length >= 3) return "Any time";
  const labels = PARTS_OF_DAY.filter((p) => parts.includes(p.key)).map((p) => p.label);
  return labels.map((label, i) => (i === 0 ? label : label.toLowerCase())).join(", ");
}
