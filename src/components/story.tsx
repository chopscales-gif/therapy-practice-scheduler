"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { startStoryAction } from "@/server/actions";
import { SAMPLE_PERSON } from "./person-fields";

/**
 * "Play the story": hands off, from a client booking online to a cancelled
 * hour filled from the waitlist. Nothing here is a recording. The story presses
 * the same buttons a visitor would, in the visitor's own sandbox, and waits for
 * each real result before moving on. It lives in memory only, so a reload or
 * the Back button simply ends it and leaves the app as far along as it got.
 */

/** One sentence per step: what is happening, and why a practice would care. */
export const STORY_CAPTIONS = [
  "A client books online, at any hour. They pick who and when, and nobody at the front desk lifts a phone.",
  "They get a link straight away and confirm with one tap. Reminders go out on their own before the day.",
  "The practice sees the week at a glance: what is confirmed, what is waiting, and what is still open.",
  "Then a client cancels. Normally that hour is lost, or someone spends the afternoon phoning round.",
  "Here the waitlist is asked automatically. The person who has waited longest and fits the time gets an offer, held for 20 minutes.",
  "This is what that person sees on their phone. One tap takes the time.",
  "Filled. The cancelled hour is booked again, and every step is on the record.",
];

type Phase = { kind: "idle" } | { kind: "starting" } | { kind: "running"; step: number } | { kind: "ended" } | { kind: "halted" };

type Story = { busy: boolean; error: string | null; start: () => void };

const StoryContext = createContext<Story>({ busy: false, error: null, start: () => {} });

export const useStory = () => useContext(StoryContext);

class Stopped extends Error {}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
/** The first one on screen: the laptop and phone layouts of a page both carry the same markers. */
const find = (marker: string) => Array.from(document.querySelectorAll<HTMLElement>(`[data-story="${marker}"]`)).find((element) => element.offsetParent !== null) ?? null;
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/** How long the story waits for the app before giving up, far longer than any step takes. */
const PATIENCE_MS = 20_000;
/** Every pause is stretched by this, so each step can be read and followed without hurrying. */
export const STORY_PACE = 1.6;
/** Room left around the part of the page the story is showing, inside the dimmed screen. */
const SPOT_MARGIN = 12;

function clearFocus() {
  document.querySelectorAll(".story-focus").forEach((element) => element.classList.remove("story-focus"));
}

function point(element: HTMLElement, block: ScrollLogicalPosition = "center") {
  clearFocus();
  element.classList.add("story-focus");
  element.scrollIntoView({ block, behavior: reducedMotion() ? "auto" : "smooth" });
}

/** The pointer the story moves, so the eye can follow it from one thing to the next. Set while the story is on screen. */
const pointer: { element: HTMLElement | null; x: number; y: number; on: HTMLElement | null; moving: boolean } = { element: null, x: 0, y: 0, on: null, moving: false };

function placePointer(x: number, y: number) {
  pointer.x = x;
  pointer.y = y;
  if (pointer.element) pointer.element.style.transform = `translate(${x}px, ${y}px)`;
}

/** Where on a thing the pointer lands: just past the middle of a button, so its label stays readable, or the near end of a wide row. */
function aim(target: HTMLElement): [number, number] {
  const rect = target.getBoundingClientRect();
  return [rect.left + Math.min(rect.width * 0.7, 150), rect.top + rect.height * 0.62];
}

/** Moves the pointer onto a thing, tracking it while the page is still scrolling. */
async function glide(target: HTMLElement, alive: () => boolean) {
  if (!pointer.element) return;
  const [fromX, fromY] = [pointer.x, pointer.y];
  const [toX, toY] = aim(target);
  // Further away takes longer, so the pointer never darts.
  const duration = reducedMotion() ? 0 : Math.min(1300, 550 + Math.hypot(toX - fromX, toY - fromY) * 0.7);
  const began = performance.now();
  pointer.moving = true;
  try {
    for (;;) {
      if (!alive() || !target.isConnected) return;
      const t = duration ? Math.min(1, (performance.now() - began) / duration) : 1;
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const [x, y] = aim(target);
      placePointer(fromX + (x - fromX) * eased, fromY + (y - fromY) * eased);
      if (t === 1) break;
      await new Promise(requestAnimationFrame);
    }
    // Once there it stays on the thing, even if the page scrolls underneath.
    pointer.on = target;
  } finally {
    pointer.moving = false;
  }
}

/** Shows the pointer pressing down, just before the story presses the real thing. */
async function tap(target: HTMLElement) {
  const element = pointer.element;
  if (!element) return;
  if (target.isConnected) placePointer(...aim(target));
  element.classList.remove("story-tap");
  void element.offsetWidth;
  element.classList.add("story-tap");
  await wait(reducedMotion() ? 0 : 420);
}

/** Types into a field the way a person would, so the page's own handlers see every change. */
async function typeInto(input: HTMLInputElement, text: string, alive: () => boolean) {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  const steps = reducedMotion() ? [text] : Array.from(text, (_, i) => text.slice(0, i + 1));
  for (const value of steps) {
    if (!alive()) return;
    set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    if (steps.length > 1) await wait(75);
  }
}

const CANCELLATIONS = "/practice/cancellations";

export function StoryProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);

  // Refs hold what the story needs between awaits, where state would be stale.
  const run = useRef(0);
  const path = useRef(pathname);
  /** The pages the story may be on right now. Anywhere else means the visitor has taken over. */
  const expected = useRef<(at: string) => boolean>(() => true);
  const active = useRef(false);
  const stopButton = useRef<HTMLButtonElement>(null);
  const closingControl = useRef<HTMLAnchorElement & HTMLButtonElement>(null);

  const finish = useCallback((next: Phase) => {
    run.current += 1;
    active.current = false;
    clearFocus();
    setPhase(next);
  }, []);

  const stop = useCallback(() => {
    finish({ kind: "idle" });
    // The play button is disabled until the next render, and a disabled button cannot take focus.
    setTimeout(() => document.querySelector<HTMLElement>('[data-story="play"]')?.focus({ preventScroll: true }));
  }, [finish]);

  useEffect(() => {
    path.current = pathname;
    // A page change the story did not make (Back, say) hands the app back to the visitor.
    if (active.current && !expected.current(pathname)) finish({ kind: "idle" });
  }, [pathname, finish]);

  const running = phase.kind === "running";
  const closing = phase.kind === "ended" || phase.kind === "halted";

  // The closing panel is about the page the story ended on, so it goes when the visitor moves on.
  const endedOn = useRef<string | null>(null);
  useEffect(() => {
    if (!closing) endedOn.current = null;
    else if (endedOn.current === null) endedOn.current = pathname;
    else if (endedOn.current !== pathname) setPhase({ kind: "idle" });
  }, [closing, pathname]);

  // The panel sits over the foot of the page, so the page grows by its height and nothing is left underneath it.
  // On the practice side the room is added inside the page, so the sidebar beside it still reaches the bottom.
  const shown = running || closing;
  useEffect(() => {
    if (!shown) return;
    const page = (pathname.startsWith("/practice") && document.querySelector("main")) || document.body;
    page.style.paddingBottom = "13rem";
    return () => void (page.style.paddingBottom = "");
  }, [shown, pathname]);

  // When the story ends, the keyboard lands on what to do next.
  useEffect(() => {
    if (closing) closingControl.current?.focus({ preventScroll: true });
  }, [closing]);

  useEffect(() => {
    if (!running) return;
    stopButton.current?.focus();
    // While the story runs, Stop is the only control: Escape presses it and Tab stays on it.
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") stop();
      else if (event.key === "Tab") {
        event.preventDefault();
        stopButton.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [running, stop]);

  const start = useCallback(async () => {
    if (active.current) return;
    active.current = true;
    setError(null);
    setPhase({ kind: "starting" });
    const generation = ++run.current;
    const alive = () => run.current === generation;

    const check = () => {
      if (!alive()) throw new Stopped();
    };
    const pause = async (ms: number) => {
      await wait(ms * STORY_PACE);
      check();
    };
    /** Waits for the app to show something, however long the server takes, and gives up only when it clearly will not. */
    const until = async <T,>(look: () => T | null | undefined | false): Promise<T> => {
      const deadline = Date.now() + PATIENCE_MS;
      for (;;) {
        check();
        const found = look();
        if (found) return found;
        if (Date.now() > deadline) throw new Error("The app did not show the next step.");
        await wait(100);
      }
    };
    const stayOn = (at: string) => void (expected.current = (now) => now === at);
    const go = async (to: string) => {
      if (path.current === to) return;
      const from = path.current;
      expected.current = (now) => now === to || now === from;
      router.push(to);
      await until(() => path.current === to);
      stayOn(to);
    };
    /** Lights a thing, walks the pointer to it, leaves time to read, then shows the press. The caller does the real press. */
    const reach = async (target: HTMLElement, readFor: number, block: ScrollLogicalPosition = "center") => {
      point(target, block);
      await pause(500);
      await glide(target, alive);
      await pause(readFor);
      await tap(target);
      check();
    };
    const ready = (marker: string) =>
      until(() => {
        const element = find(marker);
        return element && !(element as HTMLButtonElement).disabled ? element : null;
      });
    const press = async (marker: string, readFor: number) => {
      const button = await ready(marker);
      await reach(button, readFor);
      button.click();
    };
    /** Presses a button whose own action takes the app to another page, and waits to arrive there. */
    const pressTo = async (marker: string, readFor: number, arrived: (at: string) => boolean) => {
      const button = await ready(marker);
      await reach(button, readFor);
      const from = path.current;
      expected.current = (now) => now === from || arrived(now);
      button.click();
      const landed = await until(() => (arrived(path.current) ? path.current : null));
      stayOn(landed);
      clearFocus();
      // A beat with the whole new page lit, before the light narrows onto one part of it.
      await pause(1100);
    };
    /** Follows a link the way a visitor would: the pointer goes to it and presses, and then the page changes. */
    const follow = async (link: HTMLElement, to: string, readFor: number) => {
      await reach(link, readFor);
      await go(to);
      clearFocus();
      await pause(1100);
    };
    /** Clicks into a field and types, one letter at a time. */
    const fill = async (id: string, text: string) => {
      const field = document.getElementById(id) as HTMLInputElement | null;
      if (!field) throw new Error(`The ${id} field is missing.`);
      await glide(field, alive);
      await tap(field);
      await typeInto(field, text, alive);
      await pause(450);
    };
    const step = (n: number) => setPhase({ kind: "running", step: n });

    try {
      const cast = await startStoryAction();
      check();
      if (!cast.ok) {
        active.current = false;
        setPhase({ kind: "idle" });
        setError(cast.error);
        return;
      }
      stayOn(path.current);

      // A client books.
      step(1);
      await go("/");
      await until(() => find("who"));
      await pause(1400);
      await press("therapist-0", 1600);
      await pause(700);
      await press("slot", 1800);
      const details = await until(() => find("details"));
      point(details);
      await pause(1100);
      await fill("person-name", SAMPLE_PERSON.name);
      await fill("person-email", SAMPLE_PERSON.email);
      await fill("person-phone", SAMPLE_PERSON.phone);
      const card = find("card");
      if (card) {
        point(card);
        await pause(2600);
      }
      await pressTo("book", 1500, (at) => at.startsWith("/a/"));

      // They confirm from their link.
      step(2);
      point(await until(() => find("appointment")), "nearest");
      await pause(3000);
      await press("confirm", 2200);
      point(await until(() => find("confirmed")), "nearest");
      await pause(3000);

      // The practice's week.
      const practiceSide = document.querySelector<HTMLElement>('nav[aria-label="Demo view"] a[href="/practice"]');
      if (practiceSide) await follow(practiceSide, "/practice", 900);
      step(3);
      await go("/practice");
      point(await until(() => find("tiles")), "nearest");
      await pause(5200);

      // A client cancels.
      step(4);
      await pressTo("cancel-scenario", 4200, (at) => at === CANCELLATIONS);

      // The waitlist is asked.
      step(5);
      const openingId = window.location.hash.slice(1);
      const opening = () => (openingId && document.getElementById(openingId)) || find("opening");
      point(await until(opening), "nearest");
      await pause(5600);
      const offer = await until(() => find("open-offer"));
      const offerPath = offer.getAttribute("href");
      if (!offerPath) throw new Error("The offer link is missing.");
      await follow(offer, offerPath, 1800);

      // The offer, as its receiver sees it.
      step(6);
      await press("take-offer", 3600);
      const taken = await until(() => find("offer-taken"));
      point(taken, "nearest");
      await pause(3000);
      const back = taken.querySelector<HTMLElement>(`a[href="${CANCELLATIONS}"]`);
      if (back) await follow(back, CANCELLATIONS, 700);

      // Filled.
      step(7);
      await go(CANCELLATIONS);
      const filled = await until(opening);
      clearFocus();
      filled.classList.add("story-focus");
      // The last step stays on screen with the closing panel over the foot of the window, so the record is placed just above it.
      const box = filled.getBoundingClientRect();
      // The closing panel stacks its buttons on a phone, so it is taller there.
      const room = window.innerHeight - (window.innerWidth < 640 ? 256 : 208);
      window.scrollTo({ top: window.scrollY + (box.height > room ? box.top - 16 : box.bottom - room), behavior: reducedMotion() ? "auto" : "smooth" });
      await pause(2400);
      if (alive()) finish({ kind: "ended" });
    } catch (problem) {
      if (problem instanceof Stopped || !alive()) return;
      console.error(problem);
      finish({ kind: "halted" });
    }
  }, [router, finish]);

  const story = useMemo<Story>(() => ({ busy: phase.kind === "starting" || running, error, start: () => void start() }), [phase.kind, running, error, start]);

  const outline = "inline-flex min-h-11 cursor-pointer items-center rounded-[0.375rem] border-[1.5px] border-white px-4 font-bold hover:bg-white/15";

  return (
    <StoryContext.Provider value={story}>
      {children}
      {running && <Spotlight />}
      {(running || closing) && (
        <section aria-label="The story" className="on-dusk rise-in fixed inset-x-2 bottom-2 z-50 mx-auto max-w-[46rem] rounded-lg bg-dusk px-4 py-3.5 text-white shadow-[0_12px_40px_-8px_rgba(43,34,48,0.7)] sm:bottom-5 sm:px-5 sm:py-4">
          {phase.kind === "running" && (
            <div className="flex items-center gap-4">
              <div aria-live="polite" className="min-w-0 flex-1">
                <p className="text-[0.9375rem] text-white/75">
                  Demonstration build. Step {phase.step} of {STORY_CAPTIONS.length}
                </p>
                <p className="mt-0.5 text-[1.0625rem] font-bold leading-snug sm:text-lg">{STORY_CAPTIONS[phase.step - 1]}</p>
              </div>
              <button ref={stopButton} type="button" onClick={stop} className={`${outline} shrink-0`}>
                Stop
              </button>
            </div>
          )}
          {phase.kind === "ended" && (
            <div>
              <p className="text-[0.9375rem] text-white/75">Demonstration build. The story, finished</p>
              <p className="mt-0.5 text-[1.0625rem] font-bold leading-snug sm:text-lg">{STORY_CAPTIONS[STORY_CAPTIONS.length - 1]}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link ref={closingControl} href="/about" className="inline-flex min-h-11 items-center rounded-[0.375rem] bg-white px-4 font-bold text-dusk hover:bg-white/85">
                  What you just saw
                </Link>
                <button type="button" onClick={stop} className={outline}>
                  Close and look around
                </button>
              </div>
            </div>
          )}
          {phase.kind === "halted" && (
            <div role="alert">
              <p className="text-[1.0625rem] font-bold leading-snug">The story stopped because the app took too long to answer.</p>
              <p className="mt-0.5 text-[0.9375rem] text-white/85">Everything up to here is saved, so you can carry on by hand from this page.</p>
              <button ref={closingControl} type="button" onClick={stop} className={`${outline} mt-3`}>
                Close
              </button>
            </div>
          )}
        </section>
      )}
    </StoryContext.Provider>
  );
}

/**
 * The walkthrough's dimmed screen. Everything is greyed except the part the
 * story is showing, which the light follows as the page scrolls and changes.
 * It also holds the mouse, so a stray click cannot send the app somewhere the
 * story is not.
 */
function Spotlight() {
  const light = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = light.current;
    if (!element) return;
    const still = reducedMotion();
    let box: [number, number, number, number] | null = null;
    let frame = 0;

    const follow = () => {
      frame = requestAnimationFrame(follow);
      if (!pointer.moving && pointer.on?.isConnected) placePointer(...aim(pointer.on));
      const target = document.querySelector<HTMLElement>(".story-focus");
      // With nothing picked out yet, as on a page that has just opened, the light widens to the whole window.
      const rect = target?.getBoundingClientRect() ?? new DOMRect(0, 0, window.innerWidth, window.innerHeight);
      const want: [number, number, number, number] = [rect.left - SPOT_MARGIN, rect.top - SPOT_MARGIN, rect.width + 2 * SPOT_MARGIN, rect.height + 2 * SPOT_MARGIN];
      // The light glides to a new place, and keeps up with the page while it scrolls.
      box = box && !still ? (box.map((value, i) => value + (want[i] - value) * 0.16) as typeof want) : want;
      element.style.transform = `translate(${box[0]}px, ${box[1]}px)`;
      element.style.width = `${box[2]}px`;
      element.style.height = `${box[3]}px`;
    };
    follow();
    return () => cancelAnimationFrame(frame);
  }, []);

  const arrow = useRef<HTMLDivElement>(null);
  useEffect(() => {
    pointer.element = arrow.current;
    placePointer(window.innerWidth / 2, window.innerHeight / 2);
    return () => void (pointer.element = pointer.on = null);
  }, []);

  return (
    <div aria-hidden className="story-dim fixed inset-0 z-40 overflow-hidden">
      <div ref={light} className="story-light" />
      <div ref={arrow} className="story-pointer">
        <span />
        <svg viewBox="0 0 24 24" width="30" height="30">
          <path d="M5 2.5v17.2l4.6-4.3 3 6.6 2.9-1.3-3-6.5h6.3z" fill="#2b2230" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
