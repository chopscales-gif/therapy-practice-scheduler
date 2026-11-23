"use client";

import { usePractice } from "./practice-context";

/** The name over the front desk's sidebar. */
export function FrontDeskSign() {
  const practice = usePractice();
  return (
    <span className="min-w-0 font-display text-xl leading-[1.1] tracking-[-0.01em] text-dusk [overflow-wrap:anywhere] lg:text-[1.375rem]">
      {practice.custom ? practice.name : "Larkspur"}
      <span className="block font-sans text-[0.875rem] tracking-normal text-muted">Front desk</span>
    </span>
  );
}
