"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { resetDemoAction, skipAheadAction } from "@/server/actions";
import type { ClockStep } from "@/server/workflow";

/**
 * The strip across the top of every page. It is the only part of the screen
 * that belongs to the demo rather than to the fictional practice's product:
 * which side you are looking at, what time it is in the demo, and a reset.
 */
export function DemoBar({ clock }: { clock: string | null }) {
  const pathname = usePathname();
  const practiceSide = pathname.startsWith("/practice");
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
    `flex min-h-11 items-center rounded-[0.25rem] px-3 font-semibold lg:min-h-9 ${active ? "bg-ink text-white" : "text-ink hover:bg-ink/10"}`;
  const step = `${BUTTON} disabled:opacity-60`;

  return (
    <div className="demo-chrome border-b border-dashed border-amber bg-amber-tint text-sm text-ink">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-1.5 sm:gap-y-2 sm:px-6 sm:py-2">
        <p className="min-w-0 flex-1 basis-64 leading-snug">
          <strong className="font-semibold">Demonstration build.</strong> <span className="sm:hidden">Fictional practice. Nothing is sent.</span>
          <span className="hidden sm:inline">A fictional practice with invented people. Nothing is sent.</span>
        </p>
        <nav aria-label="Demo view" className="flex items-center gap-1 rounded-[0.375rem] border border-ink/25 p-0.5">
          <Link href="/" className={tab(!practiceSide)} aria-current={!practiceSide ? "page" : undefined}>
            Client side
          </Link>
          <Link href="/practice" className={tab(practiceSide)} aria-current={practiceSide ? "page" : undefined}>
            Practice side
          </Link>
        </nav>
        {clock && (
          <form action={resetDemoAction}>
            <ResetButton />
          </form>
        )}
      </div>
      {clock && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-amber/25 px-4 py-1.5 sm:gap-x-4 sm:gap-y-2 sm:px-6 sm:py-2">
          <p className="hidden leading-snug sm:block">
            Demo clock: <strong className="font-semibold tabular-nums">{clock}</strong>
          </p>
          {/* On a phone the clock is two short lines beside the skip buttons, so the bar stays small. */}
          <p className="mr-auto leading-tight sm:hidden">
            <span className="block text-[0.8125rem]">Demo clock</span>
            <strong className="block font-semibold tabular-nums">{shortClock(clock)}</strong>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={step} disabled={pending} onClick={() => skip("20min")}>
              Skip 20 minutes
            </button>
            <button type="button" className={step} disabled={pending} onClick={() => skip("tomorrow")}>
              <span className="sr-only sm:not-sr-only">Skip to </span>
              <span className="sm:hidden">Tomorrow, 8 AM</span>
              <span className="hidden sm:inline">tomorrow, 8 AM</span>
            </button>
          </div>
          {error ? (
            <p key="error" role="alert" className="min-w-0 flex-1 basis-64 font-semibold leading-snug text-flag">
              {error}
            </p>
          ) : (
            <p key="hint" className="hidden min-w-0 flex-1 basis-64 leading-snug text-amber sm:block">
              Time only moves when you skip it, so you can watch reminders go out and offers lapse.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** "Mon, Nov 16 at 9:00 AM" as "Mon, 9:00 AM". */
function shortClock(clock: string) {
  const [date, time] = clock.split(" at ");
  return time ? `${date.split(",")[0]}, ${time}` : clock;
}

const BUTTON = "min-h-11 cursor-pointer rounded-[0.25rem] border border-ink/40 px-2.5 sm:px-3 font-semibold hover:border-ink hover:bg-ink/5 lg:min-h-9";

function ResetButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${BUTTON} disabled:opacity-60`}>
      {pending ? "Resetting" : "Reset demo"}
    </button>
  );
}
