import type { Metadata } from "next";
import { SiteFrame } from "@/components/site";
import { WaitlistForm } from "@/components/waitlist-form";
import { listTherapists } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "Join the waitlist" };

export default async function WaitlistPage() {
  const therapists = await listTherapists(await getCtx());
  return (
    <SiteFrame>
      <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight">Join the waitlist</h1>
      <p className="mt-3 max-w-[60ch] text-lg leading-relaxed text-muted">
        Tell us when you could come. When someone cancels a time that fits, it is offered to whoever has waited longest, one person at a time.
      </p>
      <div className="mt-8">
        <WaitlistForm therapists={therapists.map(({ id, name, credentials, focus, offersVideo }) => ({ id, name, credentials, focus, offersVideo }))} />
      </div>
    </SiteFrame>
  );
}
