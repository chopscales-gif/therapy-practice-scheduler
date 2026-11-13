import Link from "next/link";
import { fmtDateTime, fmtTime } from "@/lib/time";
import { cancelScenarioAction } from "@/server/actions";
import type { Scenario } from "@/server/queries";
import { ActionButton } from "./action-button";

/** The one-click way into the part of the demo worth seeing. */
export function ScenarioPanel({ scenario }: { scenario: Scenario }) {
  const first = scenario.clientName.split(" ")[0];
  return (
    <aside className="mb-6 rounded-xl border border-dashed border-ink/40 px-4 py-4 sm:px-5">
      <p className="text-sm font-semibold">In this demo</p>
      {scenario.state === "ready" && (
        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <p className="max-w-[62ch] leading-relaxed text-ink-soft">
            {scenario.clientName} is booked with {scenario.therapistName} on {fmtDateTime(scenario.startsAt)}. Have {first} cancel, and watch the
            waitlist fill the time without anyone at the front desk lifting a finger.
          </p>
          <ActionButton action={cancelScenarioAction} pendingLabel="Cancelling" className="shrink-0">
            {first} cancels
          </ActionButton>
        </div>
      )}
      {scenario.state === "run" && (
        <p className="mt-1 leading-relaxed text-ink-soft">
          {first} cancelled the {fmtTime(scenario.startsAt)}.{" "}
          <Link href={`/practice/cancellations${scenario.openingId ? `#${scenario.openingId}` : ""}`} className="font-semibold underline">
            See who was offered it
          </Link>
          , or use Reset demo in the top bar to run it again.
        </p>
      )}
      {scenario.state === "missed" && (
        <p className="mt-1 leading-relaxed text-ink-soft">
          The demo clock has moved past the point where {first}&apos;s appointment could be offered to the waitlist. Open any upcoming appointment and
          cancel it to see the same thing, or use Reset demo in the top bar to start again.
        </p>
      )}
    </aside>
  );
}
