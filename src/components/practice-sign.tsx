"use client";

import { usePractice } from "./practice-context";

/** The name over the front desk's sidebar. */
export function FrontDeskSign() {
  const practice = usePractice();
  return (
    <span className="min-w-0 font-display text-xl font-medium leading-[1.1] [overflow-wrap:anywhere] lg:text-[1.375rem]">
      {practice.custom ? practice.name : "Larkspur"}
      <span className="block text-[0.9375rem] font-normal italic text-dusk-soft">Front desk</span>
    </span>
  );
}
