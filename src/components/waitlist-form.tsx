"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { OFFER_WINDOW_MINUTES, PARTS_OF_DAY, type ModePreference, type PartOfDay } from "@/lib/practice";
import { joinWaitlistAction } from "@/server/actions";
import type { TherapistOption } from "./booking-flow";
import { PersonFields, SAMPLE_PERSON } from "./person-fields";
import { DemoHint } from "./site";

const DAYS = [
  { key: 1, label: "Mon" },
  { key: 2, label: "Tue" },
  { key: 3, label: "Wed" },
  { key: 4, label: "Thu" },
  { key: 5, label: "Fri" },
];
const MODES: { key: ModePreference; label: string }[] = [
  { key: "either", label: "Either" },
  { key: "office", label: "In person" },
  { key: "video", label: "Video" },
];

export function WaitlistForm({ therapists }: { therapists: TherapistOption[] }) {
  const [therapistId, setTherapistId] = useState("any");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [parts, setParts] = useState<PartOfDay[]>(["morning", "afternoon", "evening"]);
  const [mode, setMode] = useState<ModePreference>("either");
  const [person, setPerson] = useState(SAMPLE_PERSON);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [pending, startTransition] = useTransition();

  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((other) => other !== item) : [...list, item]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await joinWaitlistAction({ ...person, therapistId: therapistId === "any" ? null : therapistId, days, parts, mode });
      if (result.ok) setJoined(true);
      else setError(result.error);
    });
  }

  if (joined) {
    return (
      <div className="arrive grid gap-5">
        <div className="border-l-4 border-good bg-good-tint px-5 py-5">
          <h2 className="font-display text-[1.75rem] font-medium leading-tight text-good">You are on the waitlist</h2>
          <p className="mt-2 leading-relaxed">
            When a time that fits opens up, we will send you a link. It is held for you for {OFFER_WINDOW_MINUTES} minutes. If you pass, or miss it, you keep your place.
          </p>
        </div>
        <DemoHint>
          Switch to <Link href="/practice/waitlist" className="font-semibold underline">Practice side, Waitlist</Link> to see {person.name} at the end of the
          list. People who have waited longer are offered a matching time first.
        </DemoHint>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <label className="grid gap-1.5">
        <span className="font-semibold">Therapist</span>
        <select className="field" value={therapistId} onChange={(event) => setTherapistId(event.target.value)}>
          <option value="any">Any therapist</option>
          {therapists.map((therapist) => (
            <option key={therapist.id} value={therapist.id}>
              {therapist.name}, {therapist.credentials}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend className="font-semibold">Days you could come</legend>
        <div className="mt-1.5 grid grid-cols-5 gap-2 sm:max-w-md">
          {DAYS.map((day) => (
            <label key={day.key} className="choice items-center justify-center px-1 py-2.5 font-semibold">
              <input type="checkbox" className="sr-only" checked={days.includes(day.key)} onChange={() => setDays(toggle(days, day.key))} />
              {day.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-semibold">Times of day</legend>
        <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
          {PARTS_OF_DAY.map((part) => (
            <label key={part.key} className="choice flex-col px-4 py-2.5">
              <input type="checkbox" className="sr-only" checked={parts.includes(part.key)} onChange={() => setParts(toggle(parts, part.key))} />
              <span className="font-semibold">{part.label}</span>
              <span className="choice-note text-[0.8125rem]">{part.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-semibold">In person or video</legend>
        <div className="mt-1.5 grid grid-cols-3 gap-2 sm:max-w-md">
          {MODES.map((option) => (
            <label key={option.key} className="choice items-center justify-center px-2 py-2.5 font-semibold">
              <input type="radio" name="waitlist-mode" className="sr-only" checked={mode === option.key} onChange={() => setMode(option.key)} />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <PersonFields value={person} onChange={setPerson} />

      <div>
        <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto">
          {pending ? "Joining" : "Join the waitlist"}
        </button>
        {error && (
          <p role="alert" className="mt-2 text-sm text-flag">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
