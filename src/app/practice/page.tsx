import type { Metadata } from "next";
import Link from "next/link";
import { ScenarioPanel } from "@/components/scenario-panel";
import type { Therapist } from "@/db/schema";
import { addDays, compareDays, dayKey, dayOf, fmtDay, fmtTime, mondayOf, parseDayKey, zonedTime, type Day } from "@/lib/time";
import { listTherapists, scenario, weekView, type Cell, type WeekView } from "@/server/queries";
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

  const week = await weekView(ctx, therapist, monday);
  const today = dayOf(ctx.now);
  const href = (t: Therapist, w: Day) => `/practice?t=${t.id}&w=${dayKey(w)}`;
  const previous = compareDays(monday, earliest) > 0 ? addDays(monday, -7) : null;
  const next = compareDays(monday, latest) < 0 ? addDays(monday, 7) : null;
  const pager = "btn btn-quiet min-h-11 px-4 py-1.5 text-[0.9375rem]";

  return (
    <>
      {demo && <ScenarioPanel scenario={demo} />}
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="font-display text-[2.25rem] font-medium leading-[1.1] tracking-[-0.01em] lg:text-[2.625rem]">
            {compareDays(monday, thisWeek) === 0 ? "This week" : `Week of ${fmtDay(zonedTime(monday, 12)).replace(/^\w+, /, "")}`}
          </h1>
          <p className="mt-1 text-[1.0625rem] text-muted">
            {fmtDay(zonedTime(monday, 12))} to {fmtDay(zonedTime(addDays(monday, 4), 12))}. {therapist.name}, {therapist.credentials}: {week.booked} booked,{" "}
            {week.open} still open {compareDays(monday, thisWeek) === 0 ? "this week" : "that week"}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {compareDays(monday, thisWeek) !== 0 && (
            <Link href={href(therapist, thisWeek)} className="mr-2 flex min-h-11 items-center font-semibold text-accent underline">
              Back to this week
            </Link>
          )}
          {previous ? <Link href={href(therapist, previous)} className={pager}>Earlier</Link> : <span aria-disabled="true" className={`${pager} opacity-40`}>Earlier</span>}
          {next ? <Link href={href(therapist, next)} className={pager}>Later</Link> : <span aria-disabled="true" className={`${pager} opacity-40`}>Later</span>}
        </div>
      </div>

      <nav aria-label="Therapist" className="-mx-4 flex gap-x-7 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {therapists.map((item) => (
          <Link
            key={item.id}
            href={href(item, monday)}
            aria-current={item.id === therapist.id ? "page" : undefined}
            className={`flex min-h-11 shrink-0 items-center border-b-[3px] font-display text-xl ${
              item.id === therapist.id ? "border-accent font-medium text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {item.name}
          </Link>
        ))}
      </nav>

      <WeekGrid week={week} today={today} />
      <DayList week={week} today={today} />
      <p className="mt-4 hidden flex-wrap gap-x-6 gap-y-1 text-[0.9375rem] text-muted lg:flex">
        <span className="flex items-center gap-2"><span className="h-4 w-1 bg-good" />Confirmed</span>
        <span className="flex items-center gap-2"><span className="h-4 w-1 bg-accent" />Not yet confirmed</span>
        <span className="flex items-center gap-2"><span className="size-4 rounded-[0.1875rem] border border-dashed border-amber bg-amber-tint" />Offered to the waitlist</span>
      </p>
    </>
  );
}

const isSameDay = (a: Day, b: Day) => compareDays(a, b) === 0;

/** Wide screens: the week as a page of the front desk's day-book, hours down the side, days across. */
function WeekGrid({ week, today }: { week: WeekView; today: Day }) {
  return (
    <div className="panel hidden overflow-hidden rounded-t-none border-t-2 border-t-ink lg:block">
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr>
            <th className="w-[4.5rem] border-b border-rule" />
            {week.days.map(({ day }) => (
              <th key={dayKey(day)} scope="col" className={`border-b border-l border-rule px-3 py-2.5 text-left font-semibold ${isSameDay(day, today) ? "bg-dusk text-white" : ""}`}>
                {fmtDay(zonedTime(day, 12))}
                {isSameDay(day, today) && <span className="ml-2 font-display text-[0.9375rem] font-normal italic text-dusk-soft">today</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {week.hours.map((hour, row) => (
            <tr key={hour}>
              <th scope="row" className="border-t border-line px-3 py-2 text-right align-top text-[0.9375rem] font-normal tabular-nums text-muted">
                {hourLabel(hour)}
              </th>
              {week.days.map(({ day, cells }) => (
                <td key={dayKey(day)} className={`h-[3.75rem] border-l border-t border-line p-1 align-top ${cells[row].kind === "off" ? "off-hours" : ""}`}>
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

const statusNote = (appointment: { mode: string; status: string; source: string }) =>
  `${appointment.mode === "video" ? "Video" : "In person"}${appointment.status === "booked" ? ", not confirmed" : ""}${appointment.source === "waitlist" ? ", from waitlist" : ""}`;

function CellBody({ cell }: { cell: Cell }) {
  if (cell.kind === "off") return null;
  if (cell.kind === "open") return <p className="px-2 py-1.5 font-display text-[0.9375rem] italic text-muted">{cell.past ? "" : "Open"}</p>;
  if (cell.kind === "held") {
    return (
      <Link href={`/practice/cancellations#${cell.openingId}`} className="block h-full rounded-[0.1875rem] border border-dashed border-amber bg-amber-tint px-2 py-1.5 text-[0.9375rem] font-semibold leading-tight text-amber hover:border-solid">
        Offered to the waitlist
      </Link>
    );
  }
  const { appointment, clientName } = cell;
  const tone =
    appointment.status === "confirmed" ? "border-good bg-good-tint" : appointment.status === "completed" ? "border-rule bg-paper text-muted" : "border-accent bg-accent-tint";
  return (
    <Link href={`/practice/appointments/${appointment.id}`} className={`block h-full rounded-r-[0.1875rem] border-l-[3px] px-2 py-1.5 leading-tight hover:outline hover:outline-1 hover:outline-ink ${tone}`}>
      <span className="block font-semibold">{clientName}</span>
      <span className="block text-[0.875rem] text-ink-soft">{statusNote(appointment)}</span>
    </Link>
  );
}

/** Phones: one day after another, each a plain list of that day's sessions. */
function DayList({ week, today }: { week: WeekView; today: Day }) {
  return (
    <div className="mt-5 grid gap-6 lg:hidden">
      {week.days.map(({ day, cells }) => {
        const working = cells.filter((cell) => cell.kind !== "off");
        return (
          <section key={dayKey(day)}>
            <h2 className="mb-2 border-b-2 border-ink pb-1 font-display text-xl font-medium">
              {fmtDay(zonedTime(day, 12))}
              {isSameDay(day, today) && <span className="ml-2 text-base font-normal italic text-muted">today</span>}
            </h2>
            {working.length === 0 ? (
              <p className="text-muted">Not in the office.</p>
            ) : (
              <ul className="panel divide-y divide-line overflow-hidden">
                {working.map((cell) => (
                  <li key={cell.startsAt.toISOString()} className="flex items-stretch">
                    <span className="w-24 shrink-0 whitespace-nowrap px-3 py-3.5 text-[0.9375rem] tabular-nums text-muted">{fmtTime(cell.startsAt)}</span>
                    <DayListEntry cell={cell} />
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

function DayListEntry({ cell }: { cell: Cell }) {
  if (cell.kind === "appointment") {
    const { appointment, clientName } = cell;
    return (
      <Link href={`/practice/appointments/${appointment.id}`} className={`min-w-0 flex-1 border-l-[3px] px-3 py-3 leading-tight ${appointment.status === "confirmed" ? "border-good" : appointment.status === "booked" ? "border-accent" : "border-rule"}`}>
        <span className="block font-semibold">{clientName}</span>
        <span className="block text-[0.875rem] text-muted">
          {appointment.mode === "video" ? "Video" : "In person"}, {appointment.status === "booked" ? "not confirmed" : appointment.status}
          {appointment.source === "waitlist" && ", from waitlist"}
        </span>
      </Link>
    );
  }
  if (cell.kind === "held") {
    return (
      <Link href={`/practice/cancellations#${cell.openingId}`} className="flex-1 border-l-[3px] border-dashed border-amber bg-amber-tint px-3 py-3.5 font-semibold text-amber">
        Offered to the waitlist
      </Link>
    );
  }
  return <span className="flex-1 border-l-[3px] border-transparent px-3 py-3.5 font-display italic text-muted">{cell.kind === "open" && cell.past ? "Was open" : "Open"}</span>;
}
