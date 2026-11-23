import Link from "next/link";
import { DemoHint, SiteFrame } from "@/components/site";
import { DEMO_PRACTICE } from "@/lib/practice";

const PLACES = [
  { href: "/", title: "Book an appointment", note: "See the open times and pick one" },
  { href: "/waitlist", title: "Join the waitlist", note: "Be offered a time when someone cancels" },
  { href: "/practice", title: "Go to the practice side", note: "The calendar, waitlist and messages the front desk sees" },
];

export default function NotFound() {
  return (
    <SiteFrame
      greeting="Sorry about that."
      title={
        <>
          That page <em>is not here.</em>
        </>
      }
      lede="The address may be mistyped, or the link may have run out."
    >
      <section className="max-w-[44rem]">
        <h2 className="font-display text-[1.7rem] leading-tight text-dusk">Where would you like to go?</h2>
        <ul className="mt-4 grid gap-2.5">
          {PLACES.map((place) => (
            <li key={place.href}>
              <Link href={place.href} className="choice group min-h-16 items-center justify-between gap-4 px-5 py-3">
                <span>
                  <span className="block text-[1.125rem] font-semibold group-hover:text-accent-deep">{place.title}</span>
                  <span className="text-[0.9375rem] text-muted">{place.note}</span>
                </span>
                <span aria-hidden="true" className="text-2xl text-accent">
                  &rarr;
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-[0.9375rem] leading-relaxed text-muted">
          Looking for an appointment you already have? Use the link in your confirmation or reminder, or call{" "}
          <span className="whitespace-nowrap">{DEMO_PRACTICE.phone}</span>.
        </p>
      </section>
      <DemoHint className="mt-10">
        Each visitor gets their own private copy of the sample data, so an appointment or offer link only opens in the browser that created it, and
        stops working when the demo is reset.
      </DemoHint>
    </SiteFrame>
  );
}
