import type { CSSProperties } from "react";

/**
 * One colour per meaning on the practice side, the same values as the theme in
 * globals.css: blue is settled, amber is waiting on someone, mulberry is the
 * waitlist, red is a cancelled hour, grey is open or over.
 */
export const TONE = {
  good: "#27577f",
  wait: "#b97d0c",
  /** Amber dark enough to carry white text, for pills. */
  waiting: "#7a4f06",
  waitlist: "#7a2e5e",
  gone: "#a6321f",
  open: "#9a8c98",
  done: "#65586a",
} as const;

export type Tone = keyof typeof TONE;

/** Sets --c, which .pill, .tile and .appt take their colour from. */
export const tone = (name: Tone) => ({ "--c": TONE[name] }) as CSSProperties;
