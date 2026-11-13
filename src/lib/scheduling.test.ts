import { describe, expect, it } from "vitest";
import { isSessionStart, openSlots, sessionsOn, slotKey } from "./slots";
import { zonedTime } from "./time";
import { describeDays, describeParts, rankCandidates, type Candidate, type Circumstances, type OpenedSlot } from "./waitlist";

const HOURS = { 1: [9, 10, 14], 2: [15, 16] };
const MONDAY = { y: 2026, m: 11, d: 16 };
const TUESDAY = { y: 2026, m: 11, d: 17 };

describe("slots", () => {
  it("lists a therapist's sessions for a day, and none on a day off", () => {
    expect(sessionsOn(HOURS, MONDAY).map((at) => at.toISOString())).toEqual(["2026-11-16T16:00:00.000Z", "2026-11-16T17:00:00.000Z", "2026-11-16T21:00:00.000Z"]);
    expect(sessionsOn(HOURS, { y: 2026, m: 11, d: 18 })).toEqual([]);
  });

  it("only accepts real session starts", () => {
    expect(isSessionStart(HOURS, zonedTime(MONDAY, 9))).toBe(true);
    expect(isSessionStart(HOURS, zonedTime(MONDAY, 9, 30))).toBe(false);
    expect(isSessionStart(HOURS, zonedTime(MONDAY, 11))).toBe(false);
    expect(isSessionStart(HOURS, zonedTime(TUESDAY, 9))).toBe(false);
    expect(isSessionStart(HOURS, new Date(zonedTime(MONDAY, 9).getTime() + 1000))).toBe(false);
  });

  it("offers only free sessions that are at least two hours away", () => {
    const now = zonedTime(MONDAY, 8, 30);
    const taken = new Set([slotKey("t1", zonedTime(MONDAY, 14))]);
    const slots = openSlots([{ id: "t1", hours: HOURS }], taken, now);
    const firstDay = slots.filter((slot) => slot.startsAt < zonedTime(TUESDAY, 0)).map((slot) => slot.startsAt.toISOString());
    // 9:00 and 10:00 are inside the two-hour lead; 2:00 PM is taken.
    expect(firstDay).toEqual([]);
    expect(slots[0].startsAt).toEqual(zonedTime(TUESDAY, 15));
  });

  it("stops at the booking horizon and stays in time order across therapists", () => {
    const now = zonedTime(MONDAY, 7);
    const slots = openSlots(
      [
        { id: "late", hours: { 1: [16] } },
        { id: "early", hours: { 1: [10] } },
      ],
      new Set(),
      now,
    );
    expect(slots.slice(0, 2).map((slot) => slot.therapistId)).toEqual(["early", "late"]);
    // Mondays at days 0, 7, 14 and 21.
    expect(slots).toHaveLength(8);
  });
});

const NOW = zonedTime(MONDAY, 9);
const SLOT: OpenedSlot = { therapistId: "naomi", therapistName: "Naomi Feld", therapistOffersVideo: true, startsAt: zonedTime(TUESDAY, 15) };
const daysAgo = (count: number) => new Date(NOW.getTime() - count * 86_400_000);
const candidate = (over: Partial<Candidate> & { entryId: string }): Candidate => ({
  clientId: `client-${over.entryId}`,
  clientName: over.entryId,
  therapistId: null,
  days: [1, 2, 3, 4, 5],
  parts: ["morning", "afternoon", "evening"],
  mode: "either",
  joinedAt: daysAgo(5),
  ...over,
});
const facts = (over: Partial<Circumstances> = {}): Circumstances => ({ now: NOW, busyClientIds: new Set(), alreadyOffered: new Set(), holdingAnotherOffer: new Set(), cancelledByClientId: null, ...over });
const names = (verdicts: { candidate: Candidate }[]) => verdicts.map((verdict) => verdict.candidate.entryId);

describe("waitlist ranking", () => {
  it("offers to whoever has waited longest", () => {
    const { eligible } = rankCandidates(SLOT, [candidate({ entryId: "new", joinedAt: daysAgo(2) }), candidate({ entryId: "old", joinedAt: daysAgo(20) }), candidate({ entryId: "mid", joinedAt: daysAgo(9) })], facts());
    expect(names(eligible)).toEqual(["old", "mid", "new"]);
    expect(eligible[0].reason).toBe("Waiting 20 days");
  });

  it("skips people the slot does not suit, and says why", () => {
    const { eligible, skipped } = rankCandidates(
      SLOT,
      [
        candidate({ entryId: "fits" }),
        candidate({ entryId: "other-therapist", therapistId: "andre" }),
        candidate({ entryId: "wrong-day", days: [1, 3] }),
        candidate({ entryId: "mornings", parts: ["morning"] }),
      ],
      facts(),
    );
    expect(names(eligible)).toEqual(["fits"]);
    expect(Object.fromEntries(skipped.map((verdict) => [verdict.candidate.entryId, verdict.reason]))).toEqual({
      "other-therapist": "Asked for a different therapist",
      "wrong-day": "Did not list Tuesdays",
      mornings: "Did not list afternoons",
    });
  });

  it("only offers a video-only client a therapist who works by video", () => {
    const wantsVideo = candidate({ entryId: "video", mode: "video" });
    expect(names(rankCandidates(SLOT, [wantsVideo], facts()).eligible)).toEqual(["video"]);
    const inPersonOnly = { ...SLOT, therapistId: "andre", therapistName: "Andre Whitaker", therapistOffersVideo: false };
    expect(rankCandidates(inPersonOnly, [wantsVideo], facts()).skipped[0].reason).toBe("Wants video, which Andre Whitaker does not offer");
  });

  it("never offers the slot back to the person who cancelled it, to someone already busy, or to someone who had a turn", () => {
    const list = [candidate({ entryId: "cancelled" }), candidate({ entryId: "busy" }), candidate({ entryId: "passed" }), candidate({ entryId: "free" })];
    const { eligible, skipped } = rankCandidates(
      SLOT,
      list,
      facts({ cancelledByClientId: "client-cancelled", busyClientIds: new Set(["client-busy"]), alreadyOffered: new Set(["passed"]) }),
    );
    expect(names(eligible)).toEqual(["free"]);
    expect(skipped).toHaveLength(3);
  });

  it("uses the practice's local hour, not UTC, to decide the part of day", () => {
    // 5:00 PM in Denver is already midnight UTC the next day.
    const evening = { ...SLOT, startsAt: zonedTime(TUESDAY, 17) };
    const { eligible } = rankCandidates(evening, [candidate({ entryId: "evenings", days: [2], parts: ["evening"] })], facts());
    expect(names(eligible)).toEqual(["evenings"]);
  });

  it("describes preferences in plain words", () => {
    expect(describeDays([4, 2])).toBe("Tue, Thu");
    expect(describeDays([1, 2, 3, 4, 5])).toBe("Any weekday");
    expect(describeParts(["evening", "afternoon"])).toBe("Afternoons, evenings");
    expect(describeParts(["morning", "afternoon", "evening"])).toBe("Any time");
  });
});
