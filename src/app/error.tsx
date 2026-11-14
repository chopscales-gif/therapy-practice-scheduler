"use client";

import { AsideIntro, SiteFrame } from "@/components/site";

export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <SiteFrame aside={<AsideIntro greeting="Sorry about that." title="This page did not load" />}>
      <section className="max-w-[40rem]">
        <p className="text-[1.0625rem] leading-relaxed text-ink-soft">
          Try again. If it keeps happening, use Reset demo in the bar at the top to start from a fresh copy of the sample data. This demo needs cookies
          turned on to keep your copy separate from other visitors.
        </p>
        <button type="button" onClick={() => retry()} className="btn btn-primary mt-6">
          Try again
        </button>
      </section>
    </SiteFrame>
  );
}
