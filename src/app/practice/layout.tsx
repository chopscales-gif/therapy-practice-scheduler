import Link from "next/link";
import { PracticeNav } from "@/components/practice-nav";
import { FrontDeskSign } from "@/components/practice-sign";
import { LarkspurMark } from "@/components/site";
import { liveOfferCount, outboxCount, waitlistView } from "@/server/queries";
import { getCtx } from "@/server/session";

export default async function PracticeLayout({ children }: LayoutProps<"/practice">) {
  const ctx = await getCtx();
  const [messages, offering, waiting] = await Promise.all([outboxCount(ctx), liveOfferCount(ctx), waitlistView(ctx)]);
  const { practice } = ctx;
  return (
    <div className="flex flex-1 flex-col bg-desk lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <div className="on-dusk bg-dusk text-white">
        <div className="flex flex-col px-4 py-2.5 lg:sticky lg:top-0 lg:min-h-[min(100%,calc(100vh-5.5rem))] lg:px-0 lg:pb-8 lg:pt-7">
          <Link href="/practice" className="flex min-h-11 items-center gap-3 self-start rounded-sm lg:ml-3 lg:px-2">
            <LarkspurMark className="h-8 w-5 shrink-0 text-lark-pale lg:h-10 lg:w-6" />
            <FrontDeskSign />
          </Link>
          <PracticeNav waiting={waiting.length} offering={offering} messages={messages} />
          <p className="mt-auto hidden px-5 pt-10 text-sm leading-relaxed text-dusk-soft lg:block">
            The practice side of the demo: what the front desk at {practice.name} would see.
          </p>
        </div>
      </div>
      <div className="flex min-w-0 flex-col">
        <main className="w-full max-w-[86rem] flex-1 px-4 pb-10 pt-6 sm:px-6 lg:px-9 lg:pt-[30px]">{children}</main>
        <footer className="border-t border-edge px-4 pb-24 pt-5 sm:px-6 lg:px-9 lg:pb-5">
          <p className="max-w-[60rem] text-sm leading-relaxed text-muted">
            {/* A visitor's own practice is real, so only the sample data is called invented. */}
            {practice.custom ? "Shown with your practice's name. Every client here is invented." : `${practice.name} is a fictional practice and every client here is invented.`}{" "}
            This demo is designed with HIPAA in mind. It is not HIPAA compliant or certified.
          </p>
        </footer>
      </div>
    </div>
  );
}
