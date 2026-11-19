"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/server/actions";

type Props = {
  action: () => Promise<ActionResult>;
  children: React.ReactNode;
  pendingLabel: string;
  variant?: "primary" | "quiet" | "danger";
  className?: string;
  /** The name "Play the story" finds this button by. */
  story?: string;
};

/** A button that runs one server action, follows it where it leads, and shows the reason if the workflow refuses. */
export function ActionButton({ action, children, pendingLabel, variant = "primary", className = "", story }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
      else if (result.goto) router.push(result.goto);
    });
  }

  return (
    <div className={className}>
      <button type="button" data-story={story} onClick={onClick} disabled={pending} className={`btn btn-${variant} w-full sm:w-auto`}>
        {pending ? pendingLabel : children}
      </button>
      {error && (
        <p role="alert" className="mt-2 max-w-[40rem] font-bold text-flag">
          {error}
        </p>
      )}
    </div>
  );
}
