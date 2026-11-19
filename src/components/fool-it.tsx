"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/server/actions";

export type Attempt = { label: string; run: () => Promise<ActionResult> };

/**
 * "Try to fool it": one press asks the real app for something it should
 * refuse, and its own answer is shown underneath. A note from the demo, so it
 * wears the demo's dashed amber and never the practice's colours.
 */
export function FoolIt({ children, attempts, className = "" }: { children: React.ReactNode; attempts: Attempt[]; className?: string }) {
  const [pending, startTransition] = useTransition();
  const [tried, setTried] = useState<{ label: string; result: ActionResult } | null>(null);

  function attempt(item: Attempt) {
    startTransition(async () => {
      const result = await item.run();
      setTried({ label: item.label, result });
    });
  }

  return (
    <aside className={`max-w-[44rem] rounded-[0.375rem] border-[1.5px] border-dashed border-amber bg-amber-tint/60 px-4 py-3 ${className}`}>
      <p className="eyebrow !text-amber">In this demo: try to fool it</p>
      <p className="mt-1 leading-relaxed text-ink">{children}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {attempts.map((item) => (
          <button key={item.label} type="button" disabled={pending} onClick={() => attempt(item)} className="btn btn-quiet min-h-11 px-4 py-1.5 text-left text-[0.9375rem]">
            {item.label}
          </button>
        ))}
      </div>
      <div aria-live="polite">
        {tried && (
          <div key={tried.label} className="arrive mt-3 rounded-[0.375rem] border border-edge bg-surface px-4 py-3">
            <p className="eyebrow">You tried: {tried.label}</p>
            {tried.result.ok ? (
              <p className="mt-1 font-bold text-flag">It went through. That should not happen: please tell ChopMedia.</p>
            ) : (
              <>
                <p className="mt-1 text-[1.0625rem] font-bold leading-snug text-flag">Refused. &ldquo;{tried.result.error}&rdquo;</p>
                <p className="mt-1 text-[0.9375rem] text-muted">That answer came from the booking rules on the server, the same ones every screen goes through. Nothing was changed.</p>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
