import Link from "next/link";
import { PageHeader } from "@/components/ui";

export default function PracticeNotFound() {
  return (
    <div className="panel max-w-[44rem] px-5 py-5 sm:px-6">
      <PageHeader title="That page is not here">
        The address may be mistyped, or it may point at an appointment from before the demo was reset. Each visitor gets a private copy of the sample
        data, so a link only opens in the browser that created it.
      </PageHeader>
      <div className="flex flex-col gap-3 sm:flex-row">
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
