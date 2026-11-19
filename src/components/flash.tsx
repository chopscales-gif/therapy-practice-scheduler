"use client";

import { useEffect, useRef } from "react";
import { liveRefresh } from "./live-updates";

/** How long after a redraw from another device a changed value still counts as that device's doing. */
const WINDOW_MS = 6000;
const SHOWN_MS = 2600;

/**
 * Draws the eye to a value that another device just changed, such as the stage
 * of an inquiry when its letter is signed on a phone. A change made on this
 * device is not marked: the visitor already knows what they clicked.
 */
export function Flash({ value, children }: { value: string; children: React.ReactNode }) {
  const element = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);

  useEffect(() => {
    if (previous.current === value) return;
    previous.current = value;
    const span = element.current;
    if (!span || Date.now() - liveRefresh.at > WINDOW_MS) return;
    span.classList.add("flash");
    const timer = setTimeout(() => span.classList.remove("flash"), SHOWN_MS);
    return () => {
      clearTimeout(timer);
      span.classList.remove("flash");
    };
  }, [value]);

  return <span ref={element}>{children}</span>;
}
