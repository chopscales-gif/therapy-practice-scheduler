import type { AppointmentStatus, OpeningStatus } from "@/db/schema";
import { tone, type Tone } from "@/lib/tones";

/** A status chip. The colour is the meaning. */
export function Pill({ is, children }: { is: Tone; children: React.ReactNode }) {
  return (
    <span className="pill" style={tone(is)}>
      {children}
    </span>
  );
}

const APPOINTMENT: Record<AppointmentStatus, { label: string; is: Tone }> = {
  booked: { label: "Not confirmed yet", is: "waiting" },
  confirmed: { label: "Confirmed", is: "good" },
  cancelled: { label: "Cancelled", is: "gone" },
  completed: { label: "Completed", is: "done" },
};

export function AppointmentChip({ status }: { status: AppointmentStatus }) {
  const { label, is } = APPOINTMENT[status];
  return <Pill is={is}>{label}</Pill>;
}

const OPENING: Record<OpeningStatus, { label: string; is: Tone }> = {
  offering: { label: "Offering now", is: "waiting" },
  filled: { label: "Filled from the waitlist", is: "waitlist" },
  unfilled: { label: "Not filled", is: "gone" },
};

export function OpeningChip({ status }: { status: OpeningStatus }) {
  const { label, is } = OPENING[status];
  return <Pill is={is}>{label}</Pill>;
}

export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="display text-[2.25rem] text-dusk lg:text-[2.75rem]">{title}</h1>
      {children && <p className="mt-2 max-w-[68ch] text-[1.0625rem] leading-relaxed text-ink-soft">{children}</p>}
    </div>
  );
}

/** One small label over one bold value. */
export function Fact({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-0.5 text-[1.0625rem] font-bold leading-snug">{children}</dd>
    </div>
  );
}

/** The line that says, wherever personal details are typed, that this is not a real practice. */
export function FakeDetailsNote() {
  return (
    <p className="rounded-xl border-[1.5px] border-dashed border-amber bg-amber-tint/50 px-4 py-2.5 text-[0.9375rem] leading-snug text-amber">
      This is a demo. Use made-up details and do not enter real personal or health information.
    </p>
  );
}
