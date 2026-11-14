import Link from "next/link";
import { PracticeNav } from "@/components/practice-nav";
import { LarkspurMark } from "@/components/site";
import { PRACTICE } from "@/lib/practice";
import { liveOfferCount, outboxCount } from "@/server/queries";
import { getCtx } from "@/server/session";

export default async function PracticeLayout({ children }: LayoutProps<"/practice">) {
  const ctx = await getCtx();
  const [messages, offering] = await Promise.all([outboxCount(ctx), liveOfferCount(ctx)]);
  return (
    <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <div className="on-dusk bg-dusk text-white">
        <div className="flex flex-col px-4 py-3 lg:sticky lg:top-0 lg:min-h-[min(100%,calc(100vh-5.5rem))] lg:px-0 lg:pb-8 lg:pt-9">
          <Link href="/practice" className="flex min-h-11 items-center gap-3 self-start rounded-sm lg:ml-3 lg:px-2">
            <LarkspurMark className="h-8 w-5 text-[#b7c1ee] lg:h-10 lg:w-6" />
            <span className="font-display text-xl font-medium leading-[1.1] lg:text-[1.375rem]">
              Larkspur
              <span className="block text-[0.9375rem] font-normal italic text-dusk-soft">Front desk</span>
            </span>
          </Link>
          <PracticeNav outboxCount={messages} offering={offering} />
          <p className="mt-auto hidden px-5 pt-10 text-sm leading-relaxed text-dusk-soft lg:block">
            The practice side of the demo: what the front desk at {PRACTICE.name} would see.
          </p>
        </div>
      </div>
      <div className="flex min-w-0 flex-col">
        <main className="w-full max-w-[82rem] flex-1 px-4 pb-10 pt-6 sm:px-6 lg:px-10 lg:pt-9">{children}</main>
        <footer className="border-t border-line px-4 pb-24 pt-5 sm:px-6 lg:px-10 lg:pb-5">
          <p className="max-w-[60rem] text-sm leading-relaxed text-muted">
            {PRACTICE.name} is a fictional practice and every client here is invented. This demo is designed with HIPAA in mind. It is not HIPAA
            compliant or certified.
          </p>
        </footer>
      </div>
    </div>
  );
}
