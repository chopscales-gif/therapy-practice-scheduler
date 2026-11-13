import { describe, expect, it } from "vitest";
import { addDays, dayKey, dayOf, fmtDateTime, localParts, mondayOf, parseDayKey, weekdayOf, zonedTime } from "./time";

describe("practice time (America/Denver)", () => {
  it("turns a wall-clock time into the right instant in winter and in summer", () => {
    expect(zonedTime({ y: 2026, m: 11, d: 17 }, 15).toISOString()).toBe("2026-11-17T22:00:00.000Z"); // MST, UTC-7
    expect(zonedTime({ y: 2026, m: 7, d: 14 }, 15).toISOString()).toBe("2026-07-14T21:00:00.000Z"); // MDT, UTC-6
  });

  it("keeps 9:00 AM at 9:00 AM across both clock changes", () => {
    // 2027: clocks go forward on March 14 and back on November 7.
    for (const day of [
      { y: 2027, m: 3, d: 13 },
      { y: 2027, m: 3, d: 14 },
      { y: 2027, m: 3, d: 15 },
      { y: 2027, m: 11, d: 6 },
      { y: 2027, m: 11, d: 7 },
      { y: 2027, m: 11, d: 8 },
    ]) {
      const at = zonedTime(day, 9);
      expect(localParts(at)).toMatchObject({ ...day, hour: 9, minute: 0 });
    }
  });

  it("moves by calendar days, not by 24 hours, over a clock change", () => {
    const friday = { y: 2027, m: 3, d: 12 };
    const monday = addDays(friday, 3);
    expect(monday).toEqual({ y: 2027, m: 3, d: 15 });
    // 71 hours apart, not 72, yet both read 2:00 PM on the wall.
    const hours = (zonedTime(monday, 14).getTime() - zonedTime(friday, 14).getTime()) / 3_600_000;
    expect(hours).toBe(71);
  });

  it("reads the local date for an instant that is already tomorrow in UTC", () => {
    const lateEvening = new Date("2026-11-18T02:30:00Z"); // 7:30 PM on the 17th in Denver
    expect(dayOf(lateEvening)).toEqual({ y: 2026, m: 11, d: 17 });
    expect(fmtDateTime(lateEvening)).toBe("Tue, Nov 17 at 7:30 PM");
  });

  it("finds weekdays and week starts across month and year ends", () => {
    expect(weekdayOf({ y: 2026, m: 11, d: 16 })).toBe(1);
    expect(mondayOf({ y: 2027, m: 1, d: 3 })).toEqual({ y: 2026, m: 12, d: 28 }); // a Sunday belongs to the week before
    expect(mondayOf({ y: 2026, m: 11, d: 16 })).toEqual({ y: 2026, m: 11, d: 16 });
  });

  it("parses day keys and refuses dates that do not exist", () => {
    expect(parseDayKey("2026-11-16")).toEqual({ y: 2026, m: 11, d: 16 });
    expect(dayKey({ y: 2026, m: 3, d: 9 })).toBe("2026-03-09");
    for (const bad of ["2026-02-31", "2026-13-01", "16/11/2026", "", undefined]) expect(parseDayKey(bad)).toBeNull();
  });
});
