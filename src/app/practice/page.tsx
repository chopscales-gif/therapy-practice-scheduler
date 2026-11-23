import type { Metadata } from "next";
import Link from "next/link";
import { ScenarioPanel } from "@/components/scenario-panel";
import type { Therapist } from "@/db/schema";
import { addDays, compareDays, dayKey, dayOf, fmtDay, fmtTime, mondayOf, parseDayKey, zonedTime, type Day } from "@/lib/time";
import { tone, type Tone } from "@/lib/tones";
import { listTherapists, scenario, waitlistView, weekView, type Cell, type WeekView } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "Calendar" };

const HOUR = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", hour: "numeric" });
const hourLabel = (hour: number) => HOUR.format(new Date(Date.UTC(2026, 0, 1, hour)));

export default async function CalendarPage({ searchParams }: PageProps<"/practice">) {
  const query = await searchParams;
  const ctx = await getCtx();
  const therapists = await listTherapists(ctx);
  const therapist = therapists.find((item) => item.id === query.t) ?? therapists[0];

  // The calendar covers the week the demo opened on to three weeks ahead: the range the sample data fills.
  const demo = await scenario(ctx);
  const thisWeek = mondayOf(dayOf(ctx.now));
  const asked = parseDayKey(typeof query.w === "string" ? query.w : undefined);
  const earliest = demo ? mondayOf(dayOf(demo.startsAt)) : thisWeek;
  const latest = addDays(thisWeek, 21);
  let monday = asked ? mondayOf(asked) : thisWeek;
  if (compareDays(monday, earliest) < 0) monday = earliest;
  if (compareDays(monday, latest) > 0) monday = latest;

  // The tiles count the whole practice; the calendar under them shows one therapist.
  const [weeks, waiting] = await Promise.all([Promise.all(therapists.map((item) => weekView(ctx, item, monday))), waitlistView(ctx)]);
  const week = weeks[therapists.indexOf(therapist)];
  const total = (key: keyof WeekView["counts"]) => weeks.reduce((sum, item) => sum + item.counts[key], 0);
  const current = compareDays(monday, thisWeek) === 0;
  const today = dayOf(ctx.now);
  const href = (t: Therapist, w: Day) => `/practice?t=${t.id}&w=${dayKey(w)}`;
  const previous = compareDays(monday, earliest) > 0 ? addDays(monday, -7) : null;
  const next = compareDays(monday, latest) < 0 ? addDays(monday, 7) : null;
  const pager = "btn btn-quiet min-h-11 px-4 py-1.5 text-[0.9375rem]";
  const gone = total("gone");

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="display text-[2.25rem] text-dusk lg:text-[2.75rem]">
            {current ? "This week" : `Week of ${fmtDay(zonedTime(monday, 12)).replace(/^\w+, /, "")}`}
          </h1>
          <p className="mt-1 text-[1.0625rem] text-ink-soft">
            {fmtDay(zonedTime(monday, 12))} to {fmtDay(zonedTime(addDays(monday, 4), 12))}, all {therapists.length} therapists.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!current && (
            <Link href={href(therapist, thisWeek)} className="mr-2 flex min-h-11 items-center font-semibold text-accent-deep underline underline-offset-4">
              Back to this week
            </Link>
          )}
          {previous ? <Link href={href(therapist, previous)} className={pager}>Earlier</Link> : <span aria-disabled="true" className={`${pager} opacity-40`}>Earlier</span>}
          {next ? <Link href={href(therapist, next)} className={pager}>Later</Link> : <span aria-disabled="true" className={`${pager} opacity-40`}>Later</span>}
        </div>
      </div>

      <div data-story="tiles" className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Tile is="good" count={total("confirmed")} label="Confirmed" />
        <Tile is="wait" count={total("unconfirmed")} label="Not confirmed yet" />
        <Tile is="open" count={total("open")} label="Open times" />
        <Tile is="waitlist" count={waiting.length} label="On the waitlist" href="/practice/waitlist" />
        <Tile is="gone" count={gone} label="Cancelled, not yet filled" href="/practice/cancellations" loud={gone > 0} className="max-md:col-span-2" />
      </div>

      {demo && (
        <div className="mt-4">
          <ScenarioPanel scenario={demo} />
        </div>
      )}

      <section className="panel mt-5 px-3 pb-4 pt-4 sm:px-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <nav aria-label="Therapist" className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1">
            {therapists.map((item) => (
              <Link
                key={item.id}
                href={href(item, monday)}
                aria-current={item.id === therapist.id ? "page" : undefined}
                className={`flex min-h-11 shrink-0 items-center rounded-full border-[1.5px] px-4 font-semibold ${
                  item.id === therapist.id ? "border-dusk bg-dusk text-white" : "border-edge bg-surface text-ink-soft hover:border-dusk hover:text-ink"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[0.9375rem] font-bold text-ink-soft">
            <Key is="good">Confirmed</Key>
            <Key is="wait">Not confirmed</Key>
            <Key is="waitlist">Filled from waitlist</Key>
            <Key is="gone">Cancelled</Key>
          </ul>
        </div>
        <p className="mt-2 text-[0.9375rem] text-muted">
          {therapist.name}, {therapist.credentials}: {week.counts.confirmed + week.counts.unconfirmed} booked, {week.counts.open} still open{" "}
          {current ? "this week" : "that week"}.
        </p>
        <WeekGrid week={week} today={today} />
        <DayList week={week} today={today} />
      </section>
    </>
  );
}

function Tile({ is, count, label, href, loud = false, className = "" }: { is: Tone; count: number; label: string; href?: string; loud?: boolean; className?: string }) {
  const body = (
    <>
      <p className={`font-display text-[2.375rem] leading-none tracking-[-0.02em] tabular-nums ${loud ? "text-flag" : "text-dusk"}`}>{count}</p>
      <p className="mt-1.5 text-[0.9375rem] font-bold leading-tight">{label}</p>
    </>
  );
  const classes = `tile ${loud ? "!bg-flag-tint" : ""} ${className}`;
  return href ? (
    <Link href={href} style={tone(is)} className={`${classes}`}>
      {body}
    </Link>
  ) : (
    <div style={tone(is)} className={classes}>
      {body}
    </div>
  );
}

function Key({ is, children }: { is: Tone; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden="true" className="size-3 rounded-[4px] bg-(--c)" style={tone(is)} />
      {children}
    </li>
  );
}

const isSameDay = (a: Day, b: Day) => compareDays(a, b) === 0;

/** Wide screens: the week as a page of the front desk's day-book, hours down the side, days across. */
function WeekGrid({ week, today }: { week: WeekView; today: Day }) {
  return (
    <div className="mt-3 hidden overflow-x-auto rounded-2xl border border-edge lg:block">
      <table className="w-full min-w-[46rem] table-fixed border-collapse">
        <thead>
          <tr>
            <th className="w-16 border-b border-edge bg-paper" />
            {week.days.map(({ day }) => (
              <th
                key={dayKey(day)}
                scope="col"
                className={`border-b border-l border-edge px-3 py-2.5 text-left font-bold ${isSameDay(day, today) ? "bg-accent-tint text-accent-deep" : "bg-paper"}`}
              >
                {fmtDay(zonedTime(day, 12))}
                {isSameDay(day, today) && <span className="ml-2 text-[0.9375rem] font-normal">today</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {week.hours.map((hour, row) => (
            <tr key={hour}>
              <th scope="row" className="border-t border-line px-2 py-2 text-right align-top text-[0.9375rem] font-bold tabular-nums text-muted">
                {hourLabel(hour)}
              </th>
              {week.days.map(({ day, cells }) => (
                <td key={dayKey(day)} className={`h-[3.9rem] border-l border-t border-line p-1 align-top ${cells[row].kind === "off" ? "off-hours" : ""}`}>
                  <CellBody cell={cells[row]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Booked = Extract<Cell, { kind: "appointment" }>["appointment"];

/** The colour an appointment wears, and the words that say the same thing for anyone who cannot see the colour. */
function look(appointment: Booked): { is: Tone; tint: string; note: string } {
  const where = appointment.mode === "video" ? "Video" : "In person";
  if (appointment.status === "completed") return { is: "done", tint: "bg-paper text-muted", note: `${where}, completed` };
  const settled = appointment.status === "confirmed" ? "" : ", not confirmed";
  if (appointment.source === "waitlist") return { is: "waitlist", tint: "bg-accent-tint", note: `${where}, from waitlist${settled}` };
  return appointment.status === "confirmed" ? { is: "good", tint: "bg-good-tint", note: where } : { is: "wait", tint: "bg-amber-tint", note: `${where}${settled}` };
}

const goneNote = (cell: Extract<Cell, { kind: "gone" }>) => (cell.offering ? "Cancelled, offered to waitlist" : "Cancelled, not filled");

function CellBody({ cell }: { cell: Cell }) {
  if (cell.kind === "off") return null;
  if (cell.kind === "open") {
    return cell.past ? null : (
      <p className="grid h-full place-items-center rounded-lg border-[1.5px] border-dashed border-rule text-[0.9375rem] text-muted">Open</p>
    );
  }
  if (cell.kind === "gone") {
    return (
      <Link href={`/practice/cancellations#${cell.openingId}`} style={tone("gone")} className="appt bg-flag-tint">
        <span className="block font-bold line-through decoration-flag">{cell.clientName}</span>
        <span className="block text-[0.8125rem] font-bold text-flag">{goneNote(cell)}</span>
      </Link>
    );
  }
  const { appointment, clientName } = cell;
  const { is, tint, note } = look(appointment);
  return (
    <Link href={`/practice/appointments/${appointment.id}`} style={tone(is)} className={`appt ${tint}`}>
      <span className="block font-bold">{clientName}</span>
      <span className="block text-[0.8125rem] text-ink-soft">{note}</span>
    </Link>
  );
}

/** Phones: one day after another, each a plain list of that day's sessions. */
function DayList({ week, today }: { week: WeekView; today: Day }) {
  return (
    <div className="mt-4 grid gap-6 lg:hidden">
      {week.days.map(({ day, cells }) => {
        const working = cells.filter((cell) => cell.kind !== "off");
        return (
          <section key={dayKey(day)}>
            <h2 className={`rounded-t-xl px-3 py-2 font-bold ${isSameDay(day, today) ? "bg-accent-tint text-accent-deep" : "bg-paper"}`}>
              {fmtDay(zonedTime(day, 12))}
              {isSameDay(day, today) && <span className="ml-2 font-normal">today</span>}
            </h2>
            {working.length === 0 ? (
              <p className="off-hours rounded-b-xl border border-edge px-3 py-3 text-muted">Not in the office.</p>
            ) : (
              <ul className="grid gap-1 rounded-b-xl border border-edge p-1">
                {working.map((cell) => (
                  <li key={cell.startsAt.toISOString()} className="grid min-h-[3.25rem] grid-cols-[4.75rem_minmax(0,1fr)] items-stretch">
                    <span className="self-center whitespace-nowrap px-2 text-[0.9375rem] font-bold tabular-nums text-muted">{fmtTime(cell.startsAt)}</span>
                    <CellBody cell={cell} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
