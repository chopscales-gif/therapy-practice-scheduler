import type { AppointmentStatus, OpeningStatus } from "@/db/schema";

const chip = "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[0.8125rem] font-semibold";

const APPOINTMENT: Record<AppointmentStatus, { label: string; className: string }> = {
  booked: { label: "Not yet confirmed", className: "border-line bg-surface text-muted" },
  confirmed: { label: "Confirmed", className: "border-good/30 bg-good-tint text-good" },
  cancelled: { label: "Cancelled", className: "border-flag/30 bg-flag-tint text-flag" },
  completed: { label: "Completed", className: "border-line bg-paper text-muted" },
};

export function AppointmentChip({ status }: { status: AppointmentStatus }) {
  const { label, className } = APPOINTMENT[status];
  return <span className={`${chip} ${className}`}>{label}</span>;
}

const OPENING: Record<OpeningStatus, { label: string; className: string }> = {
  offering: { label: "Offering now", className: "border-amber/30 bg-amber-tint text-amber" },
  filled: { label: "Filled from the waitlist", className: "border-good bg-good text-white" },
  unfilled: { label: "Not filled", className: "border-line bg-paper text-muted" },
};

export function OpeningChip({ status }: { status: OpeningStatus }) {
  const { label, className } = OPENING[status];
  return <span className={`${chip} ${className}`}>{label}</span>;
}

export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight">{title}</h1>
      {children && <p className="mt-2 max-w-[70ch] leading-relaxed text-muted">{children}</p>}
    </div>
  );
}

/** The line that says, wherever personal details are typed, that this is not a real practice. */
export function FakeDetailsNote() {
  return (
    <p className="rounded-lg bg-amber-tint px-3 py-2 text-sm leading-snug text-amber">
      This is a demo. Use made-up details and do not enter real personal or health information.
    </p>
  );
}
