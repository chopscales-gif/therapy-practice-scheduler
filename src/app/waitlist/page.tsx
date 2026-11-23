import type { Metadata } from "next";
import Image from "next/image";
import { StepHeading, SiteFrame } from "@/components/site";
import { OFFER_WINDOW_MINUTES } from "@/lib/practice";
import { WaitlistForm } from "@/components/waitlist-form";
import { listTherapists } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "Join the waitlist" };

const STEPS = [
  "Someone cancels a time that fits what you told us.",
  `We send you a link. The time is held for you for ${OFFER_WINDOW_MINUTES} minutes.`,
  "Take it and you are booked. Pass, or miss it, and you keep your place.",
];

export default async function WaitlistPage() {
  const therapists = await listTherapists(await getCtx());
  return (
    <SiteFrame
      title={
        <>
          First in line when a time <em>opens up.</em>
        </>
      }
      lede="Tell us when you could come. When someone cancels a time that fits, it is offered to whoever has waited longest, one person at a time."
      card={
        <div className="ticket px-5 pb-4 pt-4 sm:px-7 sm:pb-5 sm:pt-6">
          <p className="pb-2.5 font-display text-[1.375rem] tracking-[-0.01em] sm:text-2xl">How the waitlist works</p>
          <ol>
            {STEPS.map((step, index) => (
              <li key={step} className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-baseline border-t border-line py-3 leading-snug">
                <span className="font-display text-[1.55rem] text-accent">{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      }
    >
      <StepHeading n={1}>When could you come?</StepHeading>
      <div className="mt-5 grid items-start gap-x-16 lg:grid-cols-[minmax(0,40rem)_minmax(0,1fr)]">
        <WaitlistForm therapists={therapists.map(({ id, name, credentials, focus, offersVideo }) => ({ id, name, credentials, focus, offersVideo }))} />
        <div className="relative aspect-[4/5] max-h-[38rem] w-full overflow-hidden rounded-[1.75rem] shadow-rest max-lg:hidden">
          <Image src="/photos/mug.jpg" alt="" fill sizes="(min-width: 1024px) 36vw, 0px" className="object-cover" />
        </div>
      </div>
    </SiteFrame>
  );
}
