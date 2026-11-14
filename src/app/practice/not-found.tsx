import Link from "next/link";

export default function PracticeNotFound() {
  return (
    <div className="max-w-[40rem]">
      <h1 className="font-display text-[2.25rem] font-medium leading-[1.1] tracking-[-0.01em] lg:text-[2.625rem]">That page is not here</h1>
      <p className="mt-3 text-lg leading-relaxed text-muted">
        The address may be mistyped, or it may point at an appointment from before the demo was reset. Each visitor gets a private copy of the sample
        data, so a link only opens in the browser that created it.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link href="/practice" className="btn btn-primary">
          Back to the calendar
        </Link>
        <Link href="/practice/cancellations" className="btn btn-quiet">
          See cancellations
        </Link>
      </div>
    </div>
  );
}
