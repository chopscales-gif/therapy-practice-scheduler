"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/practice", label: "Calendar" },
  { href: "/practice/waitlist", label: "Waitlist" },
  { href: "/practice/cancellations", label: "Cancellations" },
  { href: "/practice/outbox", label: "Outbox" },
];

/** Side rail on wide screens, bottom bar on phones. */
export function PracticeNav({ outboxCount, offering }: { outboxCount: number; offering: number }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/practice" ? pathname === "/practice" || pathname.startsWith("/practice/appointments") : pathname.startsWith(href));

  return (
    <nav
      aria-label="Practice workspace"
      className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-surface lg:static lg:w-56 lg:shrink-0 lg:flex-col lg:gap-1 lg:border-r lg:border-t-0 lg:p-4"
    >
      <p className="mb-4 hidden px-3 font-display text-xl font-semibold leading-tight tracking-tight lg:block">
        Larkspur
        <span className="block font-sans text-[0.8125rem] font-normal tracking-normal text-muted">Front desk</span>
      </p>
      {ITEMS.map((item) => {
        const active = isActive(item.href);
        const badge = item.href === "/practice/outbox" ? outboxCount : item.href === "/practice/cancellations" ? offering : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 items-center justify-center gap-2 px-1 py-3 text-[0.8125rem] font-semibold sm:text-sm lg:flex-none lg:justify-between lg:rounded-md lg:px-3 lg:py-2 ${
              active ? "text-accent-deep shadow-[inset_0_2px_0_var(--color-accent)] lg:bg-accent-tint lg:shadow-none" : "text-muted hover:text-ink"
            }`}
          >
            {item.label}
            {badge > 0 && (
              <span
                className={`hidden rounded-full px-2 text-[0.8125rem] tabular-nums lg:inline ${item.href === "/practice/cancellations" ? "bg-amber-tint text-amber" : "bg-paper text-muted"}`}
              >
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
