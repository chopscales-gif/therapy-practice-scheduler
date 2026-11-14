import type { Metadata } from "next";
import { AsideIntro, SiteFrame } from "@/components/site";
import { OFFER_WINDOW_MINUTES } from "@/lib/practice";
import { WaitlistForm } from "@/components/waitlist-form";
import { listTherapists } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "Join the waitlist" };

export default async function WaitlistPage() {
  const therapists = await listTherapists(await getCtx());
  return (
    <SiteFrame
      aside={
        <>
          <AsideIntro title="Join the waitlist">
            Tell us when you could come. When someone cancels a time that fits, it is offered to whoever has waited longest, one person at a time.
          </AsideIntro>
          <ol className="mt-8 hidden max-w-[34ch] gap-4 text-[1.0625rem] leading-snug lg:grid">
            {[
              "Someone cancels a time that fits what you told us.",
              `We send you a link. The time is held for you for ${OFFER_WINDOW_MINUTES} minutes.`,
              "Take it and you are booked. Pass, or miss it, and you keep your place.",
            ].map((step, index) => (
              <li key={step} className="grid grid-cols-[1.75rem_minmax(0,1fr)] border-t border-white/15 pt-4">
                <span className="font-display text-xl italic text-dusk-soft">{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </>
      }
    >
      <div className="max-w-[40rem]">
        <WaitlistForm therapists={therapists.map(({ id, name, credentials, focus, offersVideo }) => ({ id, name, credentials, focus, offersVideo }))} />
      </div>
    </SiteFrame>
  );
}
