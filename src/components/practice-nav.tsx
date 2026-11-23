"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/practice", label: "Calendar" },
  { href: "/practice/waitlist", label: "Waitlist" },
  { href: "/practice/cancellations", label: "Cancellations" },
  { href: "/practice/outbox", label: "Outbox" },
] as const;

type Counts = { waiting: number; offering: number; messages: number };

/** A list down the front desk's panel on wide screens, a bar along the bottom on phones. */
export function PracticeNav({ waiting, offering, messages }: Counts) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/practice" ? pathname === "/practice" || pathname.startsWith("/practice/appointments") : pathname.startsWith(href));
  const badges: Record<string, { count: number; what: string; urgent?: boolean }> = {
    "/practice/waitlist": { count: waiting, what: "waiting" },
    "/practice/cancellations": { count: offering, what: "being offered now", urgent: true },
    "/practice/outbox": { count: messages, what: "messages" },
  };

  return (
    <nav aria-label="Practice workspace" className="fixed inset-x-0 bottom-0 z-10 flex gap-1 border-t border-edge bg-surface p-1.5 shadow-[0_-8px_24px_-16px_rgba(61,36,49,0.35)] lg:static lg:shadow-none lg:mt-8 lg:flex-col lg:border-t-0 lg:p-0 lg:px-3">
      {ITEMS.map((item) => {
        const active = isActive(item.href);
        const badge = badges[item.href];
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-1 text-[0.875rem] font-semibold lg:flex-none lg:justify-between lg:px-3 lg:text-[1.0625rem] ${
              active ? "bg-accent-tint text-accent-deep" : "text-ink-soft hover:bg-paper hover:text-ink"
            }`}
          >
            {item.label}
            {badge && badge.count > 0 && (
              <span
                className={`hidden min-w-7 rounded-full px-2 text-center text-[0.875rem] leading-6 tabular-nums lg:inline ${
                  badge.urgent ? "bg-amber-tint text-amber" : active ? "bg-surface text-accent-deep" : "bg-desk text-ink-soft"
                }`}
              >
                {badge.count}
                <span className="sr-only"> {badge.what}</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
