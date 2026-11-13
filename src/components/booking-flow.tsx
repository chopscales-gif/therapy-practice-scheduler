"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { Mode } from "@/lib/practice";
import { bookAction } from "@/server/actions";
import { PersonFields, SAMPLE_PERSON } from "./person-fields";

export type TherapistOption = { id: string; name: string; credentials: string; focus: string; offersVideo: boolean };
export type SlotOption = { therapistId: string; iso: string; dayKey: string; weekday: string; date: string; time: string };

type Props = { therapists: TherapistOption[]; slots: SlotOption[] };

/** Three choices on one page: who, when, and how to reach you. Each appears once the one before is made. */
export function BookingFlow({ therapists, slots }: Props) {
  const router = useRouter();
  const [therapistId, setTherapistId] = useState<string>("any");
  const [mode, setMode] = useState<Mode>("office");
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
  const days = useMemo(() => {
    const seen = new Map<string, { dayKey: string; weekday: string; date: string; count: number }>();
    for (const slot of matching) {
      const day = seen.get(slot.dayKey) ?? { dayKey: slot.dayKey, weekday: slot.weekday, date: slot.date, count: 0 };
      day.count++;
      seen.set(slot.dayKey, day);
    }
    return [...seen.values()];
  }, [matching]);
  const activeDay = days.find((day) => day.dayKey === dayKey) ? dayKey : (days[0]?.dayKey ?? null);
  const times = matching.filter((slot) => slot.dayKey === activeDay);
  const selection = picked && matching.some((slot) => slot.iso === picked.iso && slot.therapistId === picked.therapistId) ? picked : null;

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

  return (
    <form onSubmit={submit} className="grid gap-10">
      <section aria-labelledby="who">
        <h2 id="who" className="font-display text-xl font-semibold tracking-tight">
          1. Who would you like to see?
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="choice flex-col px-4 py-3">
            <input type="radio" name="therapist" className="sr-only" checked={therapistId === "any"} onChange={() => chooseTherapist("any")} />
            <span className="font-semibold">First available</span>
            <span className="text-[0.9375rem] text-muted">Show every open time</span>
          </label>
          {therapists.map((therapist) => (
            <label key={therapist.id} className="choice flex-col px-4 py-3">
              <input type="radio" name="therapist" className="sr-only" checked={therapistId === therapist.id} onChange={() => chooseTherapist(therapist.id)} />
              <span className="font-semibold">
                {therapist.name}, {therapist.credentials}
              </span>
              <span className="text-[0.9375rem] text-muted">{therapist.focus}</span>
              <span className="mt-1 text-[0.8125rem] text-muted">{therapist.offersVideo ? "In person or video" : "In person only"}</span>
            </label>
          ))}
        </div>
        <fieldset className="mt-5">
          <legend className="font-semibold">How would you like to meet?</legend>
          <div className="mt-1.5 grid grid-cols-2 gap-2 sm:max-w-xs">
            <label className="choice items-center justify-center px-3 py-2.5 font-semibold">
              <input type="radio" name="mode" className="sr-only" checked={mode === "office"} onChange={() => setMode("office")} />
              In person
            </label>
            <label className={`choice items-center justify-center px-3 py-2.5 font-semibold ${videoUnavailable ? "cursor-not-allowed opacity-50" : ""}`}>
              <input type="radio" name="mode" className="sr-only" disabled={videoUnavailable} checked={mode === "video"} onChange={() => { setMode("video"); setPicked(null); }} />
              Video
            </label>
          </div>
          {videoUnavailable && <p className="mt-1.5 text-sm text-muted">{chosen!.name} sees clients in person only.</p>}
        </fieldset>
      </section>

      <section aria-labelledby="when">
        <h2 id="when" className="font-display text-xl font-semibold tracking-tight">
          2. Pick a time
        </h2>
        {days.length === 0 ? (
          <p className="mt-3 rounded-xl border border-line bg-surface px-4 py-4 leading-relaxed">
            No open times in the next three weeks. <Link href="/waitlist" className="font-semibold text-accent underline">Join the waitlist</Link> and you
            will be offered the first cancellation that fits.
          </p>
        ) : (
          <>
            <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" role="group" aria-label="Day">
              {days.map((day) => (
                <button
                  key={day.dayKey}
                  type="button"
                  aria-pressed={day.dayKey === activeDay}
                  onClick={() => setDayKey(day.dayKey)}
                  className="choice shrink-0 flex-col items-center px-3.5 py-2 leading-tight"
                >
                  <span className="text-[0.8125rem] text-muted">{day.weekday}</span>
                  <span className="font-semibold">{day.date}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Time">
              {times.map((slot) => (
                <button
                  key={`${slot.therapistId}|${slot.iso}`}
                  type="button"
                  aria-pressed={selection?.iso === slot.iso && selection.therapistId === slot.therapistId}
                  onClick={() => setPicked(slot)}
                  className="choice flex-col items-start px-3.5 py-2.5 text-left leading-tight"
                >
                  <span className="font-semibold tabular-nums">{slot.time}</span>
                  {therapistId === "any" && <span className="mt-0.5 text-[0.8125rem] text-muted">{byId.get(slot.therapistId)!.name}</span>}
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted">
              Sessions are 50 minutes. Times are Mountain Time. Nothing that suits you?{" "}
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
          <h2 id="you" className="font-display text-xl font-semibold tracking-tight">
            3. Your details
          </h2>
          <div className="mt-3">
            <PersonFields value={person} onChange={setPerson} />
          </div>
          <div className="mt-6 rounded-xl bg-accent-tint px-4 py-4">
            <p className="leading-relaxed">
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
  );
}
