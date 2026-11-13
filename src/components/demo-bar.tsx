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

  const tab = (active: boolean) => `rounded px-3 py-1.5 font-semibold ${active ? "bg-white text-ink" : "text-white/80 hover:text-white"}`;
  const step = "cursor-pointer rounded border border-white/30 px-2.5 py-1 font-semibold hover:border-white disabled:opacity-60";

  return (
    <div className="demo-chrome bg-ink text-sm text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2 sm:px-6">
        <p className="min-w-0 flex-1 basis-64 leading-snug">
          <strong className="font-semibold">Demonstration build.</strong>{" "}
          <span className="text-white/75">A fictional practice with invented people. Nothing is sent.</span>
        </p>
        <nav aria-label="Demo view" className="flex items-center gap-1 rounded-md bg-white/10 p-1">
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
      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:px-6">
          <p className="leading-snug">
            <span className="text-white/75">Demo clock:</span> <strong className="font-semibold tabular-nums">{clock}</strong>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={step} disabled={pending} onClick={() => skip("20min")}>
              Skip 20 minutes
            </button>
            <button type="button" className={step} disabled={pending} onClick={() => skip("tomorrow")}>
              Skip to tomorrow, 8 AM
            </button>
          </div>
          {error ? (
            <p key="error" role="alert" className="min-w-0 flex-1 basis-64 leading-snug">
              {error}
            </p>
          ) : (
            <p key="hint" className="min-w-0 flex-1 basis-64 leading-snug text-white/75">
              Time only moves when you skip it, so you can watch reminders go out and offers lapse.
            </p>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

function ResetButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="cursor-pointer rounded border border-white/30 px-3 py-1.5 font-semibold hover:border-white disabled:opacity-60">
      {pending ? "Resetting" : "Reset demo"}
    </button>
  );
}
