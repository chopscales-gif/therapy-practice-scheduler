import type { CSSProperties } from "react";

/**
 * One colour per meaning on the practice side, the same values as the theme in
 * globals.css: green is settled, amber is waiting on someone, rosewood is the
 * waitlist, red is a cancelled hour, grey is open or over.
 */
export const TONE = {
  good: "#2e6e58",
  wait: "#c98a12",
  /** Amber dark enough to carry white text, for pills. */
  waiting: "#8a5a08",
  waitlist: "#a24a5c",
  gone: "#b23a2c",
  open: "#a2959b",
  done: "#6f6068",
} as const;

export type Tone = keyof typeof TONE;

/** Sets --c, which .pill, .tile and .appt take their colour from. */
export const tone = (name: Tone) => ({ "--c": TONE[name] }) as CSSProperties;
