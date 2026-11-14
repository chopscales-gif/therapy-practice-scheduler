import { notFound } from "next/navigation";

/** Any practice-side address that is not a real page gets the practice side's own "not here" screen. */
export default function PracticeCatchAll(): never {
  notFound();
}
