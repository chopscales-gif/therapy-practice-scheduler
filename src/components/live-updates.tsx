"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Asked this often while a hand-off link is live and the tab is showing. */
const INTERVAL_MS = 2500;
/** The event a screen sends after making a hand-off link, so the asking starts at once. */
export const HANDOFF_EVENT = "demo:handoff";

/** When this device last redrew because another one changed something. Read by Flash. */
export const liveRefresh = { at: 0 };

/**
 * Keeps two devices in step during a hand-off. While a join link is live and
 * this tab is showing, it asks the server a cheap yes-or-no question every few
 * seconds and redraws the page only on a yes. It stops by itself when the link
 * expires or the tab is hidden, so an idle tab costs the database nothing.
 */
export function LiveUpdates() {
  const router = useRouter();
  const [notice, setNotice] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let asking = false;

    const stop = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };

    async function ask() {
      stop();
      if (cancelled || asking || document.visibilityState !== "visible") return;
      asking = true;
      let until: number | null = null;
      try {
        const response = await fetch("/api/changes", { cache: "no-store" });
        if (response.ok) {
          const answer = (await response.json()) as { changed: boolean; until: number | null };
          until = answer.until;
          if (answer.changed && !cancelled) {
            liveRefresh.at = Date.now();
            router.refresh();
            setNotice(true);
            if (hide.current) clearTimeout(hide.current);
            hide.current = setTimeout(() => setNotice(false), 5000);
          }
        }
      } catch {
        // Offline for a moment. The next visit to the tab asks again.
      }
      asking = false;
      if (!cancelled && until && until > Date.now() && document.visibilityState === "visible") timer.current = setTimeout(ask, INTERVAL_MS);
    }

    const onVisibility = () => (document.visibilityState === "visible" ? void ask() : stop());
    const onHandoff = () => void ask();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener(HANDOFF_EVENT, onHandoff);
    void ask();
    return () => {
      cancelled = true;
      stop();
      if (hide.current) clearTimeout(hide.current);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener(HANDOFF_EVENT, onHandoff);
    };
  }, [router]);

  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 top-3 z-30 flex justify-center px-4">
      {notice && <p className="on-dusk rise-in rounded bg-dusk px-4 py-2.5 text-[0.9375rem] font-bold text-white shadow-lg">Updated just now from your other device</p>}
    </div>
  );
}
