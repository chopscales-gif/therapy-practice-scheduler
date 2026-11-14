"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { MODE_LABEL, SESSION_MINUTES, type Mode } from "@/lib/practice";
import { bookAction } from "@/server/actions";
import { PersonFields, SAMPLE_PERSON } from "./person-fields";
import { AppointmentCard, AsideIntro, SiteFrame } from "./site";

export type TherapistOption = { id: string; name: string; credentials: string; focus: string; offersVideo: boolean };
export type SlotOption = { therapistId: string; iso: string; dayKey: string; weekday: string; date: string; time: string };
/** One working week of the booking window, Monday to Friday. */
export type WeekOption = { key: string; label: string; days: { dayKey: string; weekday: string; date: string }[] };

type Props = { therapists: TherapistOption[]; slots: SlotOption[]; weeks: WeekOption[] };

/**
 * Three choices on one page: who, when, and how to reach you. The appointment
 * card on the practice's panel fills in as they are made.
 */
export function BookingFlow({ therapists, slots, weeks }: Props) {
  const router = useRouter();
  const [therapistId, setTherapistId] = useState<string>("any");
  const [mode, setMode] = useState<Mode>("office");
  const [weekKey, setWeekKey] = useState<string | null>(null);
  const [dayKey, setDayKey] = useState<string | null>(null);
  const [picked, setPicked] = useState<SlotOption | null>(null);
  const [person, setPerson] = useState(SAMPLE_PERSON);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const byId = useMemo(() => new Map(therapists.map((therapist) => [therapist.id, therapist])), [therapists]);
  const chosen = therapistId === "any" ? null : byId.get(therapistId)!;
  const videoUnavailable = chosen !== null && !chosen.offersVideo;

  const matching = useMemo(
    () => slots.filter((slot) => (therapistId === "any" || slot.therapistId === therapistId) && (mode === "office" || byId.get(slot.therapistId)!.offersVideo)),
    [slots, therapistId, mode, byId],
  );
  const byDay = useMemo(() => {
    const map = new Map<string, SlotOption[]>();
    for (const slot of matching) map.set(slot.dayKey, [...(map.get(slot.dayKey) ?? []), slot]);
    return map;
  }, [matching]);
  const open = (week: WeekOption) => week.days.reduce((total, day) => total + (byDay.get(day.dayKey)?.length ?? 0), 0);

  // The week on show: the one asked for, or the first with something open.
  const week = weeks.find((item) => item.key === weekKey) ?? weeks.find((item) => open(item) > 0) ?? weeks[0];
  const weekIndex = weeks.indexOf(week);
  // On a phone one day shows at a time: the one asked for, or the first with something open.
  const activeDay = week?.days.find((day) => day.dayKey === dayKey && byDay.has(day.dayKey)) ?? week?.days.find((day) => byDay.has(day.dayKey)) ?? null;
  const selection = picked && matching.some((slot) => slot.iso === picked.iso && slot.therapistId === picked.therapistId) ? picked : null;
  const isPicked = (slot: SlotOption) => selection?.iso === slot.iso && selection.therapistId === slot.therapistId;

  function chooseTherapist(next: string) {
    setTherapistId(next);
    setPicked(null);
    if (next !== "any" && !byId.get(next)!.offersVideo) setMode("office");
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selection) return;
    setError(null);
    startTransition(async () => {
      const result = await bookAction({ ...person, therapistId: selection.therapistId, startsAt: selection.iso, mode });
      if (!result.ok) setError(result.error);
      else if (result.goto) router.push(result.goto);
    });
  }

  const withWhom = selection ? byId.get(selection.therapistId)! : chosen;
  const timeButton = (slot: SlotOption) => (
    <button
      key={`${slot.therapistId}|${slot.iso}`}
      type="button"
      aria-pressed={isPicked(slot)}
      onClick={() => setPicked(slot)}
      className="choice min-h-11 flex-col items-start justify-center px-3 py-1.5 text-left leading-tight"
    >
      <span className="font-semibold tabular-nums">{slot.time}</span>
      {therapistId === "any" && <span className="choice-note text-[0.8125rem]">{byId.get(slot.therapistId)!.name}</span>}
    </button>
  );
  const pager = "btn btn-quiet min-h-11 px-3.5 py-1.5 text-[0.9375rem]";

  return (
    <SiteFrame
      aside={
        <>
          <AsideIntro title="Book an appointment">
            Choose a therapist and a time that suits you. You will get a confirmation with a link to confirm or cancel, and reminders before the day.
          </AsideIntro>
          <AppointmentCard
            className="mt-9 hidden lg:block"
            heading="Your appointment"
            lines={[
              { label: "Day", value: selection ? `${selection.weekday}, ${selection.date}` : null },
              { label: "Time", value: selection?.time ?? null, note: selection ? `${SESSION_MINUTES} minutes, Mountain Time` : null },
              { label: "With", value: withWhom ? withWhom.name : null, note: withWhom?.credentials },
              { label: "Where", value: MODE_LABEL[mode] },
            ]}
            footer={selection ? "Add your details on the right to book it." : "Pick a time and it is written in here."}
          />
        </>
      }
    >
      <form onSubmit={submit} className="grid grid-cols-[minmax(0,1fr)] gap-10">
        <section aria-labelledby="who">
          <h2 id="who" className="font-display text-[1.625rem] font-medium leading-tight">
            1. Who would you like to see?
          </h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 min-[1400px]:grid-cols-4">
            <label className="choice flex-col px-4 py-3">
              <input type="radio" name="therapist" className="sr-only" checked={therapistId === "any"} onChange={() => chooseTherapist("any")} />
              <span className="font-semibold">First available</span>
              <span className="choice-note text-[0.9375rem]">Show every open time, with whoever is free</span>
            </label>
            {therapists.map((therapist) => (
              <label key={therapist.id} className="choice flex-col px-4 py-3">
                <input type="radio" name="therapist" className="sr-only" checked={therapistId === therapist.id} onChange={() => chooseTherapist(therapist.id)} />
                <span className="font-semibold">
                  {therapist.name}, {therapist.credentials}
                </span>
                <span className="choice-note text-[0.9375rem] leading-snug">{therapist.focus}</span>
                <span className="choice-note mt-auto pt-1 text-[0.8125rem]">{therapist.offersVideo ? "In person or video" : "In person only"}</span>
              </label>
            ))}
          </div>
        </section>

        <section aria-labelledby="when">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
            <h2 id="when" className="font-display text-[1.625rem] font-medium leading-tight">
              2. Pick a time
            </h2>
            <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <legend className="float-left mr-3 font-semibold">How would you like to meet?</legend>
              <div className="grid grid-cols-2 gap-2">
                <label className="choice min-h-11 items-center justify-center px-4 py-2 font-semibold">
                  <input type="radio" name="mode" className="sr-only" checked={mode === "office"} onChange={() => setMode("office")} />
                  In person
                </label>
                <label className={`choice min-h-11 items-center justify-center px-4 py-2 font-semibold ${videoUnavailable ? "cursor-not-allowed opacity-50" : ""}`}>
                  <input type="radio" name="mode" className="sr-only" disabled={videoUnavailable} checked={mode === "video"} onChange={() => { setMode("video"); setPicked(null); }} />
                  Video
                </label>
              </div>
            </fieldset>
          </div>
          {videoUnavailable && <p className="mt-2 text-sm text-muted sm:text-right">{chosen!.name} sees clients in person only.</p>}

          {matching.length === 0 || !week ? (
            <p className="panel mt-4 px-4 py-4 leading-relaxed">
              No open times in the next three weeks. <Link href="/waitlist" className="font-semibold text-accent underline">Join the waitlist</Link> and you
              will be offered the first cancellation that fits.
            </p>
          ) : (
            <>
              <div className="mt-4 flex items-center justify-between gap-3 border-b-2 border-ink pb-2">
                <p className="font-display text-xl font-medium" aria-live="polite">
                  {week.label}
                </p>
                <div className="flex gap-2">
                  <button type="button" className={pager} disabled={weekIndex <= 0} onClick={() => setWeekKey(weeks[weekIndex - 1].key)}>
                    Earlier<span className="sr-only"> week</span>
                  </button>
                  <button type="button" className={pager} disabled={weekIndex >= weeks.length - 1} onClick={() => setWeekKey(weeks[weekIndex + 1].key)}>
                    Later<span className="sr-only"> week</span>
                  </button>
                </div>
              </div>

              {/* Laptop: the working week side by side, like a page of the appointment book. */}
              <div className="hidden grid-cols-5 lg:grid" role="group" aria-label="Open times this week">
                {week.days.map((day, index) => {
                  const times = byDay.get(day.dayKey) ?? [];
                  return (
                    <div key={day.dayKey} className={`min-h-40 px-2 pb-3 pt-2.5 ${index > 0 ? "border-l border-line" : "pl-0"} ${index === 4 ? "pr-0" : ""}`}>
                      <p className="mb-2.5 leading-tight">
                        <span className="font-semibold">{day.weekday}</span> <span className="text-muted">{day.date}</span>
                      </p>
                      {times.length === 0 ? <p className="text-sm text-muted">Nothing open</p> : <div className="grid gap-1.5">{times.map(timeButton)}</div>}
                    </div>
                  );
                })}
              </div>

              {/* Phone: one day of that week at a time. */}
              <div className="lg:hidden">
                <div className="mt-3 grid grid-cols-5 gap-1.5" role="group" aria-label="Day">
                  {week.days.map((day) => (
                    <button
                      key={day.dayKey}
                      type="button"
                      disabled={!byDay.has(day.dayKey)}
                      aria-pressed={day.dayKey === activeDay?.dayKey}
                      onClick={() => setDayKey(day.dayKey)}
                      className="choice min-h-14 flex-col items-center justify-center px-1 py-1.5 leading-tight disabled:cursor-not-allowed disabled:border-line disabled:bg-transparent disabled:text-muted"
                    >
                      <span className="choice-note text-[0.8125rem]">{day.weekday}</span>
                      <span className="whitespace-nowrap text-[0.9375rem] font-semibold">{day.date}</span>
                    </button>
                  ))}
                </div>
                {activeDay ? (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label={`Open times on ${activeDay.weekday}, ${activeDay.date}`}>
                    {(byDay.get(activeDay.dayKey) ?? []).map(timeButton)}
                  </div>
                ) : (
                  <p className="mt-3 text-muted">Nothing open this week. Try a later one.</p>
                )}
              </div>

              <p className="mt-4 border-t border-line pt-3 text-sm text-muted">
                Sessions are {SESSION_MINUTES} minutes. Times are Mountain Time. Nothing that suits you?{" "}
                <Link href="/waitlist" className="font-semibold text-accent underline">
                  Join the waitlist
                </Link>
                .
              </p>
            </>
          )}
        </section>

        {selection && (
          <section aria-labelledby="you" className="arrive">
            <h2 id="you" className="font-display text-[1.625rem] font-medium leading-tight">
              3. Your details
            </h2>
            <div className="mt-3 max-w-[40rem]">
              <PersonFields value={person} onChange={setPerson} />
            </div>
            <div className="mt-6 max-w-[40rem] border-t-2 border-ink pt-4">
              <p className="text-[1.0625rem] leading-relaxed">
                <strong className="font-semibold">
                  {selection.weekday}, {selection.date} at {selection.time}
                </strong>{" "}
                with {byId.get(selection.therapistId)!.name}, {mode === "video" ? "by video" : "in person"}.
              </p>
              <button type="submit" disabled={pending} className="btn btn-primary mt-3 w-full sm:w-auto">
                {pending ? "Booking" : "Book this appointment"}
              </button>
              {error && (
                <p role="alert" className="mt-2 text-sm text-flag">
                  {error}
                </p>
              )}
            </div>
          </section>
        )}
      </form>
    </SiteFrame>
  );
}
