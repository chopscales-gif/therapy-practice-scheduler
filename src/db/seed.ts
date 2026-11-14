import { randomBytes, randomUUID } from "node:crypto";
import { cancelledMessage, offerAcceptedMessage, offerMessage, reminderMessage, type Draft } from "@/lib/messages";
import { PRACTICE, REMINDER_HOURS, SAMPLE_VISITOR_PHONE, SESSION_MINUTES, type ContactBy, type Mode, type ModePreference, type PartOfDay } from "@/lib/practice";
import { story } from "@/lib/story";
import { addDays, dayOf, mondayOf, weekdayOf, zonedTime } from "@/lib/time";
import type { Db } from "./client";
import {
  appointments,
  clients,
  offers,
  openingEvents,
  openings,
  outboxMessages,
  reminders,
  therapists,
  waitlistEntries,
  type AppointmentSource,
  type AppointmentStatus,
} from "./schema";

/**
 * The sample practice a new visitor sees: three therapists, a few weeks of
 * appointments, a waitlist, and one cancellation that the waitlist has already
 * filled. Every person here is invented.
 */

/** The demo always opens on a Monday at 9:00 AM, the next one after the visitor arrives. */
export function demoStart(realNow: Date): Date {
  const today = dayOf(realNow);
  return zonedTime(addDays(today, (8 - weekdayOf(today)) % 7 || 7), 9);
}

const WEEKDAY_HOURS = [9, 10, 11, 13, 14, 15, 16];
const LATE_HOURS = [10, 11, 12, 14, 15, 16, 17];

const THERAPISTS: { name: string; credentials: string; focus: string; offersVideo: boolean; hours: Record<string, number[]> }[] = [
  { name: "Naomi Feld", credentials: "LCSW", focus: "Adults: anxiety, grief and life changes", offersVideo: true, hours: { 1: WEEKDAY_HOURS, 2: WEEKDAY_HOURS, 3: WEEKDAY_HOURS, 4: WEEKDAY_HOURS } },
  { name: "Andre Whitaker", credentials: "LMFT", focus: "Couples and families", offersVideo: false, hours: { 2: LATE_HOURS, 3: LATE_HOURS, 4: LATE_HOURS, 5: LATE_HOURS } },
  { name: "Soo-Jin Park", credentials: "PsyD", focus: "Teens and young adults", offersVideo: true, hours: { 1: [8, 9, 10, 11, 13], 2: [16, 17, 18], 3: [8, 9, 10, 11, 13], 4: [16, 17, 18], 5: [8, 9, 10, 11, 13] } },
];

/**
 * Regular clients, who fill most of the calendar. Each has one weekly time with
 * one therapist, so nobody turns up on two therapists' calendars.
 */
const REGULARS = [
  "Alma Reyes", "Bennett Okafor", "Celeste Brannigan", "Dmitri Vance", "Eleni Pappas", "Farid Nazari", "Gwen Abernathy", "Hugo Sandoval",
  "Ingrid Solberg", "Jamal Whitfield", "Keiko Tanaka", "Leona Fitzgerald", "Mateo Quiroga", "Nadia Rahman", "Oskar Bergstrom", "Paloma Ibarra",
  "Quentin Ashby", "Renata Kowalczyk", "Silas Thornbury", "Tamsin Everly", "Ulrich Brandt", "Vivian Achebe", "Wendell Pruitt", "Ximena Calloway",
  "Yusuf Demir", "Zelda Marchetti", "Abel Navarro", "Brigid Lowell", "Caspian Rhodes", "Delphine Arceneaux", "Emeka Obi", "Fiona Castellanos",
  "Gideon Mercer", "Hana Kobayashi", "Idris Bello", "Josephine Tran", "Kofi Mensah", "Linnea Halvorsen", "Marcus Delacroix", "Noor Farouk",
  "Odette Laurent", "Pavel Novak", "Rania Aziz", "Soren Vik", "Thea Lombardi", "Umar Siddiqui", "Valentina Cruz", "Wyatt Greer",
  "Xavier Fontaine", "Yara Nasser", "Zane Whitlock", "Anneliese Roth", "Beckett Shaw", "Camila Vargas", "Dashiell Finch", "Esme Hawthorne",
  "Felix Oyelaran", "Greer Sutherland", "Hollis Benton", "Imogen Vale",
];

const WAITLIST: { name: string; daysAgo: number; therapist: number | null; days: number[]; parts: PartOfDay[]; mode: ModePreference }[] = [
  { name: "Greta Holloway", daysAgo: 30, therapist: null, days: [3], parts: ["afternoon"], mode: "either" },
  { name: "Maya Okonkwo", daysAgo: 23, therapist: null, days: [2, 4], parts: ["afternoon"], mode: "either" },
  { name: "Declan Voss", daysAgo: 19, therapist: 0, days: [1, 2, 3, 4], parts: ["morning"], mode: "office" },
  { name: "Priyanka Sethi", daysAgo: 16, therapist: 1, days: [2, 3, 4, 5], parts: ["afternoon", "evening"], mode: "office" },
  { name: "Harriet Lindgren", daysAgo: 12, therapist: 0, days: [2, 3], parts: ["afternoon"], mode: "office" },
  { name: "Samir Haddad", daysAgo: 9, therapist: null, days: [1, 2, 5], parts: ["afternoon", "evening"], mode: "video" },
  { name: "Lucia Marchand", daysAgo: 6, therapist: 2, days: [2, 4], parts: ["evening"], mode: "video" },
  { name: "Owen Castellan", daysAgo: 3, therapist: null, days: [1, 2, 3, 4, 5], parts: ["morning", "afternoon", "evening"], mode: "either" },
];

const emailFor = (name: string) => `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@mail.example`;
/**
 * 555-01xx numbers are reserved for fiction. Two are left out so that no client
 * shares a number with the practice itself or with the sample visitor.
 */
const TAKEN_NUMBERS = [PRACTICE.phone, SAMPLE_VISITOR_PHONE];
const PHONES = Array.from({ length: 90 }, (_, i) => `(801) 555-01${i + 10}`).filter((phone) => !TAKEN_NUMBERS.includes(phone));
const phoneFor = (index: number) => PHONES[index % PHONES.length];
const token = () => randomBytes(18).toString("base64url");
const minutes = (at: Date, count: number) => new Date(at.getTime() + count * 60_000);

export async function seedSandbox({ db, sandboxId, clock }: { db: Db; sandboxId: string; clock: Date }): Promise<void> {
  const monday = mondayOf(dayOf(clock));

  const therapistRows = THERAPISTS.map((therapist, position) => ({ id: randomUUID(), sandboxId, position, ...therapist }));
  const [naomi] = therapistRows;

  let people = 0;
  const person = (name: string, contactBy?: ContactBy) => {
    const index = people++;
    return { id: randomUUID(), sandboxId, name, email: emailFor(name), phone: phoneFor(index), contactBy: contactBy ?? (index % 4 === 0 ? "email" : "text") };
  };
  type Person = ReturnType<typeof person>;
  const corinne = person("Corinne Abbott", "text");
  const rosa = person("Rosa Delgado", "text");
  const tobias = person("Tobias Lindqvist", "text");
  const waiting = WAITLIST.map((entry) => ({ ...entry, client: person(entry.name, "text") }));

  type Row = typeof appointments.$inferInsert & { id: string; startsAt: Date; token: string; status: AppointmentStatus };
  const appointmentRows: Row[] = [];
  const reminderRows: (typeof reminders.$inferInsert)[] = [];
  const messages: (typeof outboxMessages.$inferInsert)[] = [];
  const send = (to: Person, draft: Draft, at: Date) =>
    messages.push({
      id: randomUUID(),
      sandboxId,
      createdAt: at,
      channel: draft.channel,
      kind: draft.kind,
      recipientName: to.name,
      recipient: draft.channel === "sms" ? to.phone : to.email,
      subject: draft.subject,
      body: draft.body,
      link: draft.link,
    });

  /** Adds an appointment with the reminders it would have by the time the demo opens. */
  const add = (therapistId: string, client: Person, startsAt: Date, options: { mode?: Mode; source?: AppointmentSource; confirmed?: boolean; createdAt?: Date } = {}) => {
    const over = minutes(startsAt, SESSION_MINUTES) <= clock;
    const status: AppointmentStatus = over ? "completed" : options.confirmed ? "confirmed" : "booked";
    const row: Row = {
      id: randomUUID(),
      sandboxId,
      therapistId,
      clientId: client.id,
      startsAt,
      mode: options.mode ?? "office",
      status,
      source: options.source ?? "front_desk",
      token: token(),
      createdAt: options.createdAt ?? minutes(clock, -14 * 24 * 60),
    };
    appointmentRows.push(row);
    for (const hoursBefore of REMINDER_HOURS) {
      const dueAt = minutes(startsAt, -hoursBefore * 60);
      if (dueAt <= row.createdAt!) continue;
      const sent = dueAt <= clock;
      reminderRows.push({ id: randomUUID(), sandboxId, appointmentId: row.id, hoursBefore, dueAt, status: sent ? "sent" : "scheduled", sentAt: sent ? dueAt : null });
      if (sent) send(client, reminderMessage(client, startsAt, hoursBefore, row.token), dueAt);
    }
    return row;
  };

  // The two appointments the demo is built around.
  const tuesdayAtThree = zonedTime(addDays(monday, 1), 15);
  const wednesdayAtTwo = zonedTime(addDays(monday, 2), 14);
  add(naomi.id, corinne, tuesdayAtThree, { confirmed: true });

  // Regular weekly clients. A fixed pattern, so every visitor sees the same calendar.
  const fixtures = new Set([tuesdayAtThree.getTime(), wednesdayAtTwo.getTime()]);
  const regulars: Person[] = [];
  const regularFor = new Map<string, Person>();
  for (let week = 0; week < 3; week++) {
    therapistRows.forEach((therapist, t) => {
      for (const [weekday, hours] of Object.entries(therapist.hours)) {
        for (const hour of hours) {
          const startsAt = zonedTime(addDays(monday, week * 7 + Number(weekday) - 1), hour);
          if (therapist.id === naomi.id && fixtures.has(startsAt.getTime())) continue;
          const mix = (t * 7 + Number(weekday) * 13 + hour * 5) % 10;
          if (mix >= [7, 5, 2][week]) continue;
          const slot = `${t}|${weekday}|${hour}`;
          let client = regularFor.get(slot);
          if (!client) {
            if (regulars.length === REGULARS.length) continue;
            client = person(REGULARS[regulars.length]);
            regulars.push(client);
            regularFor.set(slot, client);
          }
          const soon = startsAt.getTime() - clock.getTime() < 48 * 3_600_000;
          add(therapist.id, client, startsAt, { mode: therapist.offersVideo && mix % 3 === 0 ? "video" : "office", confirmed: soon && mix !== 4 });
        }
      }
    });
  }

  // Last Friday afternoon: Rosa cancelled Wednesday at 2:00, Greta did not answer, Tobias took it.
  const cancelledAt = zonedTime(addDays(monday, -3), 16, 10);
  const firstLapse = minutes(cancelledAt, 20);
  const acceptedAt = minutes(firstLapse, 7);
  const rosas = add(naomi.id, rosa, wednesdayAtTwo, { confirmed: false });
  appointmentRows.pop();
  const cancelled: Row = { ...rosas, status: "cancelled", cancelledAt };
  for (let i = reminderRows.length - 1; i >= 0; i--) if (reminderRows[i].appointmentId === cancelled.id) reminderRows.splice(i, 1);
  const filled = add(naomi.id, tobias, wednesdayAtTwo, { source: "waitlist", createdAt: acceptedAt });

  const entryRows = waiting.map((entry) => ({
    id: randomUUID(),
    sandboxId,
    clientId: entry.client.id,
    therapistId: entry.therapist === null ? null : therapistRows[entry.therapist].id,
    days: entry.days,
    parts: entry.parts,
    mode: entry.mode,
    joinedAt: zonedTime(addDays(monday, -entry.daysAgo), 11, 20),
    status: "waiting" as const,
  }));
  const greta = entryRows[0];
  const tobiasEntry = {
    id: randomUUID(),
    sandboxId,
    clientId: tobias.id,
    therapistId: naomi.id,
    days: [1, 2, 3, 4],
    parts: ["afternoon"] as PartOfDay[],
    mode: "office" as const,
    joinedAt: zonedTime(addDays(monday, -24), 9, 5),
    status: "placed" as const,
  };

  const opening = {
    id: randomUUID(),
    sandboxId,
    therapistId: naomi.id,
    startsAt: wednesdayAtTwo,
    cancelledAppointmentId: cancelled.id,
    openedAt: cancelledAt,
    status: "filled" as const,
    filledAppointmentId: filled.id,
    closedAt: acceptedAt,
  };
  const offerRows = [
    { id: randomUUID(), sandboxId, openingId: opening.id, entryId: greta.id, clientId: greta.clientId, token: token(), sentAt: cancelledAt, expiresAt: firstLapse, status: "expired" as const, respondedAt: firstLapse },
    { id: randomUUID(), sandboxId, openingId: opening.id, entryId: tobiasEntry.id, clientId: tobias.id, token: token(), sentAt: firstLapse, expiresAt: minutes(firstLapse, 20), status: "accepted" as const, respondedAt: acceptedAt },
  ];
  const gretaClient = waiting[0].client;
  send(rosa, cancelledMessage(rosa, wednesdayAtTwo), cancelledAt);
  send(gretaClient, offerMessage(gretaClient, wednesdayAtTwo, firstLapse, offerRows[0].token), cancelledAt);
  send(tobias, offerMessage(tobias, wednesdayAtTwo, offerRows[1].expiresAt, offerRows[1].token), firstLapse);
  send(tobias, offerAcceptedMessage(tobias, wednesdayAtTwo, filled.token), acceptedAt);
  const events = [
    { at: cancelledAt, tone: "neutral" as const, text: story.cancelled(rosa.name, "client") },
    { at: cancelledAt, tone: "neutral" as const, text: story.offered(gretaClient.name, "sms", firstLapse) },
    { at: firstLapse, tone: "warn" as const, text: story.expired(gretaClient.name, firstLapse) },
    { at: firstLapse, tone: "neutral" as const, text: story.offered(tobias.name, "sms", offerRows[1].expiresAt) },
    { at: acceptedAt, tone: "good" as const, text: story.accepted(tobias.name, firstLapse, acceptedAt) },
  ];

  await db.insert(therapists).values(therapistRows);
  await db.insert(clients).values([...regulars, corinne, rosa, tobias, ...waiting.map((entry) => entry.client)]);
  await db.insert(appointments).values([...appointmentRows, cancelled]);
  await db.insert(reminders).values(reminderRows);
  await db.insert(waitlistEntries).values([...entryRows, tobiasEntry]);
  await db.insert(openings).values(opening);
  await db.insert(offers).values(offerRows);
  // One at a time, so the insertion order that breaks timestamp ties is the order written here.
  for (const event of events) await db.insert(openingEvents).values({ id: randomUUID(), sandboxId, openingId: opening.id, ...event });
  messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  await db.insert(outboxMessages).values(messages);
}
