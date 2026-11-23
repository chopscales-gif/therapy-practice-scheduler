"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { DEMO_PRACTICE, PRACTICE_NAME_MAX, type Practice } from "@/lib/practice";
import { resetDemoAction, setPracticeNameAction, skipAheadAction } from "@/server/actions";
import type { ClockStep } from "@/server/workflow";
import { HandoffCard } from "./handoff";
import { useStory } from "./story";

const control = "inline-flex min-h-11 cursor-pointer items-center whitespace-nowrap rounded-full px-2 font-semibold lg:min-h-9";
const underlined = `${control} underline decoration-ink/40 underline-offset-4 hover:decoration-ink disabled:cursor-not-allowed disabled:opacity-60`;
const outlined = `${control} border-[1.5px] border-rule bg-surface hover:border-ink disabled:cursor-not-allowed disabled:opacity-60`;

/**
 * The strip across the top of every page. It is the only part of the screen
 * that belongs to the demo rather than to the practice's product: it says what
 * this is, then holds the things a visitor can try. One row on a laptop.
 */
export function DemoBar({ clock, practice }: { clock: string | null; practice: Practice }) {
  const pathname = usePathname();
  const practiceSide = pathname.startsWith("/practice");
  const story = useStory();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function skip(step: ClockStep) {
    setError(null);
    startTransition(async () => {
      const result = await skipAheadAction(step);
      if (!result.ok) setError(result.error);
    });
  }

  const tab = (active: boolean) =>
    `inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-3 font-semibold lg:min-h-9 ${active ? "bg-surface text-dusk shadow-rest" : "text-ink-soft hover:text-ink"}`;
  const problem = story.error ?? error;

  return (
    <div className="demo-chrome border-b border-[#eedfb5] bg-[#fdf6e2] text-[0.9375rem] text-ink">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1 px-4 py-2 sm:px-6">
        <p className="min-w-0 flex-1 basis-64 pr-3 leading-snug">
          <a href="https://chopmedia.vercel.app/#therapy-practice" className="mr-3 whitespace-nowrap font-semibold underline decoration-ink/40 underline-offset-4 hover:decoration-ink">
            ← All demos
          </a>{" "}
          <strong className="font-bold">Demonstration build.</strong>{" "}
          {/* A visitor's own practice is real, so with their name showing the bar says whose data is invented, and never that the practice is. */}
          {practice.custom ? (
            "Your practice's name is shown on invented sample data. Nothing is sent."
          ) : (
            <>
              <span className="sm:hidden">Fictional practice. Nothing is sent.</span>
              <span className="hidden sm:inline">{DEMO_PRACTICE.shortName} is a fictional practice, the people are invented, and nothing is sent.</span>
            </>
          )}{" "}
          {/* On a phone there is no room for this link among the controls, so it closes the sentence. */}
          <Link href="/about" className="whitespace-nowrap font-bold underline decoration-ink/40 underline-offset-4 md:hidden">
            About this demo
          </Link>
        </p>
        {/* Last on a laptop, where it ends the strip. On a phone it stays beside the notice. */}
        <nav aria-label="Demo view" className="flex items-center gap-0.5 rounded-full bg-[#f1e4bf] p-1 xl:order-last xl:ml-2">
          <Link href="/" className={tab(!practiceSide)} aria-current={!practiceSide ? "page" : undefined}>
            Client side
          </Link>
          <Link href="/practice" className={tab(practiceSide)} aria-current={practiceSide ? "page" : undefined}>
            Practice side
          </Link>
        </nav>
        <button
          type="button"
          data-story="play"
          onClick={story.start}
          disabled={story.busy}
          className={`${control} gap-2 bg-dusk px-3.5 text-white hover:bg-dusk-mid disabled:cursor-not-allowed disabled:opacity-60`}
        >
          <svg aria-hidden viewBox="0 0 12 12" className="size-3 fill-current">
            <path d="M2 1l9 5-9 5z" />
          </svg>
          {story.busy ? "Playing the story" : "Play the story"}
        </button>
        <PracticeName key={practice.custom ? practice.name : ""} practice={practice} />
        <PhoneHandoff path={pathname} />
        <Link href="/about" aria-current={pathname === "/about" ? "page" : undefined} className={`${underlined} max-md:hidden`}>
          About
        </Link>
        {clock && (
          <>
            <p className="ml-1 inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#eedfb5] bg-surface px-3 leading-none" title="Time only moves when you skip it, so you can watch reminders go out and offers lapse.">
              <span className="text-[0.875rem] font-semibold text-amber">Demo clock</span>
              <strong className="font-bold tabular-nums max-sm:hidden">{clock}</strong>
              <strong className="font-bold tabular-nums sm:hidden">{shortClock(clock)}</strong>
            </p>
            <button type="button" className={underlined} disabled={pending || story.busy} onClick={() => skip("20min")}>
              Skip 20 min
            </button>
            <button type="button" className={underlined} disabled={pending || story.busy} onClick={() => skip("tomorrow")}>
              Skip to tomorrow
            </button>
            <form action={resetDemoAction}>
              <ResetButton />
            </form>
          </>
        )}
        {problem && (
          <p role="alert" className="order-last basis-full pb-1 font-bold text-flag">
            {problem}
          </p>
        )}
      </div>
    </div>
  );
}

/** "Mon, Nov 16 at 9:00 AM" as "Mon, 9:00 AM". */
function shortClock(clock: string) {
  const [date, time] = clock.split(" at ");
  return time ? `${date.split(",")[0]}, ${time}` : clock;
}

/** The one question the demo asks: the visitor's practice name, shown in place of the fictional one. */
function PracticeName({ practice }: { practice: Practice }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(name: string | null) {
    setError(null);
    startTransition(async () => {
      const result = await setPracticeNameAction(name);
      if (!result.ok) return setError(result.error);
      setEditing(false);
      setDraft("");
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return setError("Type your practice's name first.");
    save(draft);
  }

  if (practice.custom && !editing) {
    return (
      <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1">
        <p className="min-w-0 max-w-full px-1 leading-snug sm:max-w-[22rem] sm:truncate" title={practice.name}>
          Shown as <strong className="font-bold [overflow-wrap:anywhere]">{practice.name}</strong>
        </p>
        <button type="button" onClick={() => setEditing(true)} disabled={pending} className={underlined}>
          Change
        </button>
        <button type="button" onClick={() => save(null)} disabled={pending} className={underlined}>
          {pending ? "Putting it back" : `Back to ${DEMO_PRACTICE.shortName}`}
        </button>
        {error && (
          <p role="alert" className="basis-full font-bold text-flag">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      {/* The question folds into one button, so the bar stays one row until it is asked. */}
      {!editing && (
        <button type="button" onClick={() => setEditing(true)} className={underlined}>
          Use your practice&apos;s name
        </button>
      )}
      <form onSubmit={submit} className={`min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 ${editing ? "order-last flex basis-full pb-1" : "hidden"}`}>
        <label htmlFor="practice-name" className="font-bold">
          What&apos;s your practice called?
        </label>
        <input
          id="practice-name"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={PRACTICE_NAME_MAX}
          autoComplete="organization"
          placeholder="Optional"
          aria-describedby={error ? "practice-name-error" : undefined}
          className="min-h-11 w-full min-w-0 rounded-full border-[1.5px] border-rule bg-white px-4 text-base text-ink placeholder:text-muted sm:w-72 lg:min-h-9"
        />
        <button type="submit" disabled={pending} className={outlined}>
          {pending ? "Showing it" : "Show it"}
        </button>
        {editing && (
          <button type="button" onClick={() => (setEditing(false), setError(null), setDraft(""))} className={underlined}>
            Cancel
          </button>
        )}
        <span className="text-ink-soft">Only the name changes. The people and the data stay invented.</span>
        {error && (
          <p id="practice-name-error" role="alert" className="basis-full font-bold text-flag">
            {error}
          </p>
        )}
      </form>
    </>
  );
}

/** "Continue on your phone": moves the page the visitor is on to a second device. Not offered on a phone. */
function PhoneHandoff({ path }: { path: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  function show() {
    setOpen(true);
    dialog.current?.showModal();
  }

  return (
    <>
      <button type="button" onClick={show} className={`${underlined} max-md:hidden`}>
        Continue on your phone
      </button>
      <dialog ref={dialog} onClose={() => setOpen(false)} aria-labelledby="handoff-title" className="demo-dialog m-auto w-[min(34rem,calc(100vw-2rem))] p-6 text-base text-ink">
        <p className="eyebrow !text-amber">In this demo</p>
        <h2 id="handoff-title" className="display mt-1 text-[1.875rem] text-dusk">
          Continue on your phone
        </h2>
        <div className="mt-4">
          {open && (
            <HandoffCard path={path}>
              Point your phone&apos;s camera at the code. This page opens on your phone with the same sample data, and anything you do there shows up here.
            </HandoffCard>
          )}
        </div>
        <form method="dialog" className="mt-5 flex justify-end">
          <button type="submit" className="btn btn-quiet">
            Close
          </button>
        </form>
      </dialog>
    </>
  );
}

function ResetButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={underlined}>
      {pending ? "Resetting" : "Reset"}
    </button>
  );
}
