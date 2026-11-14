import { BookingFlow, type SlotOption } from "@/components/booking-flow";
import { SiteFrame } from "@/components/site";
import { dayKey, dayOf, fmtTime, ZONE } from "@/lib/time";
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

  return (
    <SiteFrame>
      <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">Book an appointment</h1>
      <p className="mt-3 max-w-[60ch] text-lg leading-relaxed text-muted">
        Choose a therapist and a time that suits you. You will get a confirmation with a link to confirm or cancel, and reminders before the day.
      </p>
      <div className="mt-10">
        <BookingFlow therapists={therapists.map(({ id, name, credentials, focus, offersVideo }) => ({ id, name, credentials, focus, offersVideo }))} slots={options} />
      </div>
    </SiteFrame>
  );
}
