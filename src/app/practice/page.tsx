import type { Metadata } from "next";
import Link from "next/link";
import { ScenarioPanel } from "@/components/scenario-panel";
import { PageHeader } from "@/components/ui";
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

  // The calendar covers last week to four weeks out: the range the sample data fills.
  const thisWeek = mondayOf(dayOf(ctx.now));
  const asked = parseDayKey(typeof query.w === "string" ? query.w : undefined);
  const earliest = addDays(thisWeek, -7);
  const latest = addDays(thisWeek, 21);
  let monday = asked ? mondayOf(asked) : thisWeek;
  if (compareDays(monday, earliest) < 0) monday = earliest;
  if (compareDays(monday, latest) > 0) monday = latest;

  const [week, demo] = await Promise.all([weekView(ctx, therapist, monday), scenario(ctx)]);
  const today = dayOf(ctx.now);
  const href = (t: Therapist, w: Day) => `/practice?t=${t.id}&w=${dayKey(w)}`;
  const previous = compareDays(monday, earliest) > 0 ? addDays(monday, -7) : null;
  const next = compareDays(monday, latest) < 0 ? addDays(monday, 7) : null;
  const pager = "btn btn-quiet min-h-10 px-4 py-1.5 text-[0.9375rem]";

  return (
    <>
      {demo && <ScenarioPanel scenario={demo} />}
      <PageHeader title="Calendar" />

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <nav aria-label="Therapist" className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {therapists.map((item) => (
            <Link
              key={item.id}
              href={href(item, monday)}
              aria-current={item.id === therapist.id ? "page" : undefined}
              className={`shrink-0 rounded-full border px-4 py-2 font-semibold ${item.id === therapist.id ? "border-accent bg-accent text-white" : "border-line bg-surface hover:border-ink"}`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          {previous ? <Link href={href(therapist, previous)} className={pager}>Earlier</Link> : <span aria-disabled="true" className={`${pager} opacity-40`}>Earlier</span>}
          <p className="min-w-44 text-center font-semibold tabular-nums">
            {fmtDay(zonedTime(monday, 12))} to {fmtDay(zonedTime(addDays(monday, 4), 12))}
          </p>
          {next ? <Link href={href(therapist, next)} className={pager}>Later</Link> : <span aria-disabled="true" className={`${pager} opacity-40`}>Later</span>}
          {compareDays(monday, thisWeek) !== 0 && (
            <Link href={href(therapist, thisWeek)} className="px-2 font-semibold text-accent underline">
              This week
            </Link>
          )}
        </div>
      </div>

      <p className="mb-3 text-muted">
        {therapist.name}, {therapist.credentials}: {week.booked} booked, {week.open} still open this week.
      </p>

      <WeekGrid week={week} today={today} />
      <DayList week={week} today={today} />
    </>
  );
}

const isSameDay = (a: Day, b: Day) => compareDays(a, b) === 0;

/** Wide screens: hours down the side, days across. */
function WeekGrid({ week, today }: { week: WeekView; today: Day }) {
  return (
    <div className="panel hidden overflow-hidden lg:block">
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr>
            <th className="w-20 border-b border-line" />
            {week.days.map(({ day }) => (
              <th key={dayKey(day)} scope="col" className={`border-b border-l border-line px-3 py-2.5 text-left font-semibold ${isSameDay(day, today) ? "bg-accent-tint text-accent-deep" : ""}`}>
                {fmtDay(zonedTime(day, 12))}
                {isSameDay(day, today) && <span className="ml-2 text-[0.8125rem] font-normal">Today</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {week.hours.map((hour, row) => (
            <tr key={hour}>
              <th scope="row" className="border-t border-line px-3 py-2 text-right align-top text-sm font-normal tabular-nums text-muted">
                {hourLabel(hour)}
              </th>
              {week.days.map(({ day, cells }) => (
                <td key={dayKey(day)} className={`h-[4.25rem] border-l border-t border-line p-1 align-top ${cells[row].kind === "off" ? "off-hours" : ""}`}>
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

function CellBody({ cell }: { cell: Cell }) {
  if (cell.kind === "off") return null;
  if (cell.kind === "open") return <p className={`px-2 py-1.5 text-sm ${cell.past ? "text-line" : "text-muted"}`}>{cell.past ? "" : "Open"}</p>;
  if (cell.kind === "held") {
    return (
      <Link href={`/practice/cancellations#${cell.openingId}`} className="block h-full rounded-md border border-dashed border-amber bg-amber-tint px-2 py-1.5 text-sm font-semibold leading-tight text-amber hover:border-solid">
        Offered to the waitlist
      </Link>
    );
  }
  const { appointment, clientName } = cell;
  const tone =
    appointment.status === "confirmed" ? "border-good/40 bg-good-tint" : appointment.status === "completed" ? "border-line bg-paper text-muted" : "border-accent/40 bg-accent-tint";
  return (
    <Link href={`/practice/appointments/${appointment.id}`} className={`block h-full rounded-md border px-2 py-1.5 leading-tight hover:border-ink ${tone}`}>
      <span className="block truncate text-[0.9375rem] font-semibold">{clientName}</span>
      <span className="block truncate text-[0.8125rem] text-muted">
        {appointment.mode === "video" ? "Video" : "In person"}
        {appointment.status === "booked" && ", not confirmed"}
        {appointment.source === "waitlist" && ", from waitlist"}
      </span>
    </Link>
  );
}

/** Phones: one day after another, each a plain list of that day's sessions. */
function DayList({ week, today }: { week: WeekView; today: Day }) {
  return (
    <div className="grid gap-5 lg:hidden">
      {week.days.map(({ day, cells }) => {
        const working = cells.filter((cell) => cell.kind !== "off");
        return (
          <section key={dayKey(day)}>
            <h2 className={`mb-2 font-display text-lg font-semibold tracking-tight ${isSameDay(day, today) ? "text-accent-deep" : ""}`}>
              {fmtDay(zonedTime(day, 12))}
              {isSameDay(day, today) && <span className="ml-2 font-sans text-sm font-normal">Today</span>}
            </h2>
            {working.length === 0 ? (
              <p className="text-muted">Not in the office.</p>
            ) : (
              <ul className="panel divide-y divide-line overflow-hidden">
                {working.map((cell) => (
                  <li key={cell.startsAt.toISOString()} className="flex items-stretch">
                    <span className="w-24 shrink-0 whitespace-nowrap px-3 py-3 text-[0.9375rem] tabular-nums text-muted">{fmtTime(cell.startsAt)}</span>
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
      <Link href={`/practice/appointments/${appointment.id}`} className="min-w-0 flex-1 px-3 py-3 leading-tight">
        <span className="block truncate font-semibold">{clientName}</span>
        <span className="block text-[0.8125rem] text-muted">
          {appointment.mode === "video" ? "Video" : "In person"}, {appointment.status === "booked" ? "not confirmed" : appointment.status}
          {appointment.source === "waitlist" && ", from waitlist"}
        </span>
      </Link>
    );
  }
  if (cell.kind === "held") {
    return (
      <Link href={`/practice/cancellations#${cell.openingId}`} className="flex-1 bg-amber-tint px-3 py-3 font-semibold text-amber">
        Offered to the waitlist
      </Link>
    );
  }
  return <span className="flex-1 px-3 py-3 text-muted">{cell.kind === "open" && cell.past ? "Was open" : "Open"}</span>;
}
