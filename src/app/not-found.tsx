import Link from "next/link";
import { AsideIntro, DemoHint, SiteFrame } from "@/components/site";
import { PRACTICE } from "@/lib/practice";

export default function NotFound() {
  return (
    <SiteFrame aside={<AsideIntro greeting="Sorry about that." title="That page is not here">The address may be mistyped, or the link may have run out.</AsideIntro>}>
      <section className="max-w-[40rem]">
        <h2 className="font-display text-[1.625rem] font-medium leading-tight">Where would you like to go?</h2>
        <ul className="panel mt-4 divide-y divide-line">
          <li>
            <Link href="/" className="group flex min-h-16 items-center justify-between gap-4 px-5 py-3">
              <span>
                <span className="block font-display text-xl font-medium group-hover:text-accent">Book an appointment</span>
                <span className="text-[0.9375rem] text-muted">See the open times and pick one</span>
              </span>
              <span aria-hidden="true" className="font-display text-2xl text-accent">&rarr;</span>
            </Link>
          </li>
          <li>
            <Link href="/waitlist" className="group flex min-h-16 items-center justify-between gap-4 px-5 py-3">
              <span>
                <span className="block font-display text-xl font-medium group-hover:text-accent">Join the waitlist</span>
                <span className="text-[0.9375rem] text-muted">Be offered a time when someone cancels</span>
              </span>
              <span aria-hidden="true" className="font-display text-2xl text-accent">&rarr;</span>
            </Link>
          </li>
          <li>
            <Link href="/practice" className="group flex min-h-16 items-center justify-between gap-4 px-5 py-3">
              <span>
                <span className="block font-display text-xl font-medium group-hover:text-accent">Go to the practice side</span>
                <span className="text-[0.9375rem] text-muted">The calendar, waitlist and messages the front desk sees</span>
              </span>
              <span aria-hidden="true" className="font-display text-2xl text-accent">&rarr;</span>
            </Link>
          </li>
        </ul>
        <p className="mt-6 text-[0.9375rem] leading-relaxed text-muted">
          Looking for an appointment you already have? Use the link in your confirmation or reminder, or call{" "}
          <span className="whitespace-nowrap">{PRACTICE.phone}</span>.
        </p>
      </section>
      <DemoHint className="mt-10">
        Each visitor gets their own private copy of the sample data, so an appointment or offer link only opens in the browser that created it, and
        stops working when the demo is reset.
      </DemoHint>
    </SiteFrame>
  );
}
