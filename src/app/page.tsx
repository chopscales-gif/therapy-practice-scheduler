import { BookingFlow, type SlotOption, type WeekOption } from "@/components/booking-flow";
import { addDays, dayKey, dayOf, fmtTime, mondayOf, zonedTime, ZONE } from "@/lib/time";
import { bookableSlots } from "@/server/queries";
import { getCtx } from "@/server/session";

const WEEKDAY = new Intl.DateTimeFormat("en-US", { timeZone: ZONE, weekday: "short" });
const DATE = new Intl.DateTimeFormat("en-US", { timeZone: ZONE, month: "short", day: "numeric" });

export default async function BookingPage() {
  const ctx = await getCtx();
  const { therapists, slots } = await bookableSlots(ctx);
  const options: SlotOption[] = slots.map((slot) => ({
    therapistId: slot.therapistId,
    iso: slot.startsAt.toISOString(),
    dayKey: dayKey(dayOf(slot.startsAt)),
    weekday: WEEKDAY.format(slot.startsAt),
    date: DATE.format(slot.startsAt),
    time: fmtTime(slot.startsAt),
  }));

  // The working weeks that have something to book, each Monday to Friday.
  const thisWeek = dayKey(mondayOf(dayOf(ctx.now)));
  const mondays = new Map(slots.map((slot) => [dayKey(mondayOf(dayOf(slot.startsAt))), mondayOf(dayOf(slot.startsAt))]));
  const weeks: WeekOption[] = [...mondays.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, monday]) => ({
      key,
      label: key === thisWeek ? "This week" : `Week of ${DATE.format(zonedTime(monday, 12))}`,
      days: [0, 1, 2, 3, 4].map((offset) => {
        const at = zonedTime(addDays(monday, offset), 12);
        return { dayKey: dayKey(addDays(monday, offset)), weekday: WEEKDAY.format(at), date: DATE.format(at) };
      }),
    }));

  return (
    <BookingFlow
      therapists={therapists.map(({ id, name, credentials, focus, offersVideo }) => ({ id, name, credentials, focus, offersVideo }))}
      slots={options}
      weeks={weeks}
    />
  );
}
