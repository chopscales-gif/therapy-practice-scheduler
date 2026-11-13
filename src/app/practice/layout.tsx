import { PracticeNav } from "@/components/practice-nav";
import { liveOfferCount, outboxCount } from "@/server/queries";
import { getCtx } from "@/server/session";

export default async function PracticeLayout({ children }: LayoutProps<"/practice">) {
  const ctx = await getCtx();
  const [messages, offering] = await Promise.all([outboxCount(ctx), liveOfferCount(ctx)]);
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col lg:flex-row">
      <PracticeNav outboxCount={messages} offering={offering} />
      <main className="min-w-0 flex-1 px-4 pb-24 pt-6 sm:px-6 lg:pb-12 lg:pt-8">{children}</main>
    </div>
  );
}
