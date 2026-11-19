"use client";

import { createContext, useContext } from "react";
import { DEMO_PRACTICE, type Practice } from "@/lib/practice";

const PracticeContext = createContext<Practice>(DEMO_PRACTICE);

/** The practice whose name is on the screens: the fictional one, or the name a visitor typed in. */
export function PracticeProvider({ practice, children }: { practice: Practice; children: React.ReactNode }) {
  return <PracticeContext.Provider value={practice}>{children}</PracticeContext.Provider>;
}

export const usePractice = () => useContext(PracticeContext);
