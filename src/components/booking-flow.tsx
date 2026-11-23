"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { MODE_LABEL, SESSION_MINUTES, type Mode } from "@/lib/practice";
import { bookAction } from "@/server/actions";
import { PersonFields, SAMPLE_PERSON } from "./person-fields";
import { AppointmentCard, SiteFrame, StepHeading } from "./site";

export type TherapistOption = { id: string; name: string; credentials: string; focus: string; offersVideo: boolean };
export type SlotOption = { therapistId: string; iso: string; dayKey: string; weekday: string; date: string; time: string };
/** One working week of the booking window, Monday to Friday. */
export type WeekOption = { key: string; label: string; days: { dayKey: string; weekday: string; date: string }[] };

type Props = { therapists: TherapistOption[]; slots: SlotOption[]; weeks: WeekOption[]; below?: React.ReactNode; children?: React.ReactNode };

export const initialsOf = (name: string) =>
  name
    .split(/[\s-]+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/**
 * Three choices on one page: who, when, and how to reach you. The appointment
 * card beside the headline fills in as they are made.
 */
export function BookingFlow({ therapists, slots, weeks, below, children }: Props) {
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
      data-story="slot"
      aria-pressed={isPicked(slot)}
      onClick={() => setPicked(slot)}
      className="choice min-h-12 flex-col items-start justify-center !rounded-xl px-3.5 py-2 text-left leading-tight"
    >
      <span className="text-[1.0625rem] font-bold tabular-nums">{slot.time}</span>
      {therapistId === "any" && <span className="choice-note text-[0.8125rem]">{byId.get(slot.therapistId)!.name}</span>}
    </button>
  );
  const pager = "btn btn-quiet min-h-11 px-3.5 py-1.5 text-[0.9375rem]";
  const nothing = chosen ? `Nothing open with ${chosen.name.split(" ")[0]}` : "Nothing open";

  return (
    <SiteFrame
      loud
      below={below}
      title={
        <>
          A time that suits you, <em>this week.</em>
        </>
      }
      lede="Choose who you would like to see and when. You get a link to confirm or cancel, and a reminder before the day."
      card={
        <AppointmentCard
          story="card"
          heading="Your appointment"
          lines={[
            { label: "Who", value: withWhom ? withWhom.name : null, note: withWhom?.credentials },
            { label: "When", value: selection ? `${selection.weekday}, ${selection.date}` : null, note: selection ? `${selection.time}, ${SESSION_MINUTES} minutes` : null },
            { label: "Where", value: MODE_LABEL[mode] },
            { label: "Name", value: selection && person.name.trim() ? person.name.trim() : null },
          ]}
          footer={selection ? "Add your details below to book it." : "Pick a time and it is written in here."}
        />
      }
    >
      <form onSubmit={submit} className="grid grid-cols-[minmax(0,1fr)] gap-12">
        <section aria-labelledby="who" data-story="who">
          <StepHeading n={1} id="who">
            Who would you like to see?
          </StepHeading>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="choice items-start gap-3.5 px-[1.125rem] py-4 shadow-rest">
              <input type="radio" name="therapist" className="sr-only" checked={therapistId === "any"} onChange={() => chooseTherapist("any")} />
              <span className="initials shrink-0 !text-[0.9375rem]">Any</span>
              <span className="grid">
                <span className="text-[1.0625rem] font-bold leading-tight">First available</span>
                <span className="choice-note mt-0.5 text-[0.9375rem] leading-snug">Every open time, with whoever is free</span>
              </span>
            </label>
            {therapists.map((therapist, index) => (
              <label key={therapist.id} data-story={`therapist-${index}`} className="choice items-start gap-3.5 px-[1.125rem] py-4 shadow-rest">
                <input type="radio" name="therapist" className="sr-only" checked={therapistId === therapist.id} onChange={() => chooseTherapist(therapist.id)} />
                <span className="initials shrink-0">{initialsOf(therapist.name)}</span>
                <span className="grid">
                  <span className="text-[1.0625rem] font-bold leading-tight">
                    {therapist.name}, {therapist.credentials}
                  </span>
                  <span className="choice-note mt-0.5 text-[0.9375rem] leading-snug">{therapist.focus}</span>
                  <span className="choice-note mt-1.5 text-[0.875rem] font-semibold">{therapist.offersVideo ? "In person or video" : "In person only"}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section aria-labelledby="when" data-story="when">
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
            <StepHeading n={2} id="when">
              Pick a time
            </StepHeading>
            <fieldset className="flex flex-wrap items-center gap-2">
              <legend className="sr-only">How would you like to meet?</legend>
              <label className="seg">
                <input type="radio" name="mode" className="sr-only" checked={mode === "office"} onChange={() => setMode("office")} />
                In person
              </label>
              <label className="seg">
                <input type="radio" name="mode" className="sr-only" disabled={videoUnavailable} checked={mode === "video"} onChange={() => { setMode("video"); setPicked(null); }} />
                Video
              </label>
            </fieldset>
          </div>
          {videoUnavailable && <p className="mt-2 text-[0.9375rem] text-muted sm:text-right">{chosen!.name} sees clients in person only.</p>}

          {matching.length === 0 || !week ? (
            <p className="mt-4 rounded-2xl border-[1.5px] border-dashed border-rule px-5 py-4 leading-relaxed">
              No open times in the next three weeks. <Link href="/waitlist" className="font-semibold text-accent-deep underline underline-offset-4">Join the waitlist</Link> and you
              will be offered the first cancellation that fits.
            </p>
          ) : (
            <>
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-xl font-semibold text-dusk" aria-live="polite">
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
              <div className="mt-4 hidden grid-cols-5 gap-3 rounded-[1.5rem] bg-paper p-4 lg:grid" role="group" aria-label="Open times this week">
                {week.days.map((day) => {
                  const times = byDay.get(day.dayKey) ?? [];
                  return (
                    <div key={day.dayKey} className="min-w-0">
                      <p className="mb-3 px-1 leading-tight">
                        <span className="font-bold">{day.weekday}</span> <span className="text-muted">{day.date}</span>
                      </p>
                      {times.length === 0 ? (
                        <p className="rounded-2xl border-[1.5px] border-dashed border-rule px-3 py-3 text-[0.9375rem] leading-snug text-muted">{nothing}</p>
                      ) : (
                        <div className="grid gap-2">{times.map(timeButton)}</div>
                      )}
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
                      className="choice min-h-14 flex-col items-center justify-center px-1 py-1.5 leading-tight disabled:cursor-not-allowed disabled:border-dashed disabled:border-rule disabled:bg-transparent disabled:text-muted"
                    >
                      <span className="choice-note text-[0.8125rem]">{day.weekday}</span>
                      <span className="whitespace-nowrap text-[0.9375rem] font-bold">{day.date}</span>
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

              <p className="mt-4 text-[0.9375rem] text-muted">
                Sessions are {SESSION_MINUTES} minutes. Times are Mountain Time. Nothing that suits you?{" "}
                <Link href="/waitlist" className="font-semibold text-accent-deep underline underline-offset-4">
                  Join the waitlist
                </Link>
                .
              </p>
            </>
          )}
        </section>

        {selection && (
          <section aria-labelledby="you" data-story="details" className="arrive">
            <StepHeading n={3} id="you">
              Your details
            </StepHeading>
            <div className="mt-4 max-w-[40rem]">
              <PersonFields value={person} onChange={setPerson} />
            </div>
            <div className="mt-6 max-w-[40rem] rounded-2xl bg-paper px-5 py-4">
              <p className="text-[1.0625rem] leading-relaxed">
                <strong className="font-bold">
                  {selection.weekday}, {selection.date} at {selection.time}
                </strong>{" "}
                with {byId.get(selection.therapistId)!.name}, {mode === "video" ? "by video" : "in person"}.
              </p>
              <button type="submit" data-story="book" disabled={pending} className="btn btn-primary mt-3 w-full sm:w-auto">
                {pending ? "Booking" : "Book this appointment"}
              </button>
              {error && (
                <p role="alert" className="mt-2 font-bold text-flag">
                  {error}
                </p>
              )}
            </div>
          </section>
        )}
      </form>
      {children}
    </SiteFrame>
  );
}
