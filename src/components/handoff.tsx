"use client";

import { useEffect, useRef, useState } from "react";
import { createHandoffAction, type HandoffView } from "@/server/actions";
import { HANDOFF_EVENT } from "./live-updates";

/** Light modules around the code, which a phone camera needs to find it. */
const QUIET = 4;

/**
 * A short-lived link that opens this visitor's sandbox on a second device,
 * shown as a QR code. Belongs to the demo, not to the practice's software, so it
 * is only ever placed inside a dashed demo note or the demo bar's dialog.
 */
export function HandoffCard({ path, children }: { path: string; children: React.ReactNode }) {
  const [view, setView] = useState<HandoffView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    const request = ++latest.current;
    let timer: ReturnType<typeof setTimeout> | undefined;
    void createHandoffAction(path).then((result) => {
      if (request !== latest.current) return;
      if (!result.ok) return setError(result.error);
      setView(result.view);
      timer = setTimeout(() => setExpired(true), Math.max(0, result.view.expiresAt - Date.now()));
      // Tells this device to start checking for what the other one does.
      window.dispatchEvent(new Event(HANDOFF_EVENT));
    });
    return () => {
      latest.current += 1;
      clearTimeout(timer);
    };
  }, [path, attempt]);

  function again() {
    setView(null);
    setError(null);
    setExpired(false);
    setAttempt((n) => n + 1);
  }

  if (error) {
    return (
      <div>
        <p role="alert" className="font-bold text-flag">
          {error}
        </p>
        <button type="button" onClick={again} className="btn btn-quiet mt-3">
          Try again
        </button>
      </div>
    );
  }
  if (!view) return <p className="text-muted">Making a link for your phone</p>;
  if (expired) {
    return (
      <div>
        <p className="font-bold">That code has expired.</p>
        <p className="mt-1 text-[0.9375rem] text-muted">A code works for 15 minutes.</p>
        <button type="button" onClick={again} className="btn btn-quiet mt-3">
          Make a new code
        </button>
      </div>
    );
  }

  if (!view.qr) {
    return (
      <div>
        <p className="leading-relaxed">
          This copy of the demo is running on your own computer, at an address a phone cannot open, so there is no code to scan. On the hosted demo a QR code
          appears here.
        </p>
        <p className="mt-3 text-[0.9375rem] text-muted">To try it on this computer, open this link in a second browser. It works for 15 minutes.</p>
        <p className="mt-1.5 select-all break-all rounded border border-line bg-paper px-3 py-2 font-mono text-sm">{view.url}</p>
      </div>
    );
  }

  const size = view.qr.length + QUIET * 2;
  return (
    <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="QR code that opens this demo on your phone" shapeRendering="crispEdges" className="size-44 shrink-0 rounded-sm border border-line bg-white">
        {view.qr.map((row, y) => row.split("").map((cell, x) => (cell === "1" ? <rect key={`${x}-${y}`} x={x + QUIET} y={y + QUIET} width={1} height={1} fill="#2e2228" /> : null)))}
      </svg>
      <div className="min-w-0 flex-1 basis-48">
        <div className="leading-relaxed">{children}</div>
        <p className="mt-2 text-[0.9375rem] text-muted">The code works for 15 minutes and only opens your copy of the sample data.</p>
      </div>
    </div>
  );
}

/** "Answer it on your phone", beside a live offer on the practice side: the visitor becomes the person on the waitlist. */
export function PhoneOffer({ path, firstName }: { path: string; firstName: string }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-quiet max-md:hidden">
        Be {firstName} on your phone
      </button>
    );
  }
  return (
    <div className="mt-4 basis-full border-t border-dashed border-amber pt-4">
      <HandoffCard path={path}>
        Point your phone&apos;s camera at the code. It opens the page {firstName} was sent, where you can take the time or pass. Leave this page open: it
        updates by itself when you answer.
      </HandoffCard>
    </div>
  );
}
