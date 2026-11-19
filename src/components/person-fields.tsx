"use client";

import { SAMPLE_VISITOR_PHONE, type ContactBy } from "@/lib/practice";
import { FakeDetailsNote } from "./ui";

export type Person = { name: string; email: string; phone: string; contactBy: ContactBy };

/** The sample visitor, filled in so nobody has to type their own details into a demo. */
export const SAMPLE_PERSON: Person = { name: "Jordan Ellery", email: "jordan.ellery@mail.example", phone: SAMPLE_VISITOR_PHONE, contactBy: "text" };

export function PersonFields({ value, onChange }: { value: Person; onChange: (next: Person) => void }) {
  const set = <K extends keyof Person>(key: K, next: Person[K]) => onChange({ ...value, [key]: next });
  return (
    <div className="grid gap-4">
      <FakeDetailsNote />
      <label className="grid gap-1.5">
        <span className="font-bold">Name</span>
        <input id="person-name" className="field" autoComplete="off" required maxLength={80} value={value.name} onChange={(event) => set("name", event.target.value)} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="font-bold">Email</span>
          <input id="person-email" className="field" type="email" autoComplete="off" required maxLength={120} value={value.email} onChange={(event) => set("email", event.target.value)} />
        </label>
        <label className="grid gap-1.5">
          <span className="font-bold">Mobile phone</span>
          <input id="person-phone" className="field" type="tel" autoComplete="off" required maxLength={30} value={value.phone} onChange={(event) => set("phone", event.target.value)} />
        </label>
      </div>
      <fieldset>
        <legend className="font-bold">Send reminders by</legend>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {(["text", "email"] as const).map((option) => (
            <label key={option} className="seg">
              <input type="radio" name="contactBy" className="sr-only" checked={value.contactBy === option} onChange={() => set("contactBy", option)} />
              {option === "text" ? "Text message" : "Email"}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
