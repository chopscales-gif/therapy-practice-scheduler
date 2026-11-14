"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/practice", label: "Calendar" },
  { href: "/practice/waitlist", label: "Waitlist" },
  { href: "/practice/cancellations", label: "Cancellations" },
  { href: "/practice/outbox", label: "Outbox" },
];

/** A list down the front desk's panel on wide screens, a bar along the bottom on phones. */
export function PracticeNav({ outboxCount, offering }: { outboxCount: number; offering: number }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/practice" ? pathname === "/practice" || pathname.startsWith("/practice/appointments") : pathname.startsWith(href));

  return (
    <nav aria-label="Practice workspace" className="fixed inset-x-0 bottom-0 z-10 flex border-t border-white/20 bg-dusk lg:static lg:mt-10 lg:flex-col lg:border-t-0">
      {ITEMS.map((item) => {
        const active = isActive(item.href);
        const badge = item.href === "/practice/outbox" ? outboxCount : item.href === "/practice/cancellations" ? offering : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-12 flex-1 items-center justify-center gap-2 px-1 text-[0.875rem] font-semibold lg:min-h-11 lg:flex-none lg:justify-between lg:border-l-[3px] lg:px-4 lg:text-[1.0625rem] ${
              active
                ? "text-white shadow-[inset_0_3px_0_#b7c1ee] lg:border-[#b7c1ee] lg:bg-white/10 lg:shadow-none"
                : "text-dusk-soft hover:text-white lg:border-transparent"
            }`}
          >
            {item.label}
            {badge > 0 && (
              <span
                className={`hidden rounded-[0.25rem] px-2 text-[0.875rem] tabular-nums lg:inline ${item.href === "/practice/cancellations" ? "bg-amber-tint text-amber" : "bg-white/15 text-white"}`}
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
