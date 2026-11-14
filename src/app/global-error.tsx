"use client";

/** Replaces the whole page when the root layout itself fails, for instance while the database is waking up. */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "Georgia, serif", margin: 0, padding: "4rem 1rem", color: "#2b2230", background: "#f1eceb" }}>
        <main style={{ maxWidth: "40rem", margin: "0 auto" }}>
          <title>This page did not load</title>
          <h1 style={{ fontSize: "1.75rem" }}>This page did not load</h1>
          <p style={{ lineHeight: 1.6 }}>The demo may still be waking up. Give it a moment and try again.</p>
          <button type="button" onClick={() => retry()} style={{ marginTop: "1rem", padding: "0.7rem 1.25rem", font: "inherit", fontWeight: 600, cursor: "pointer", color: "#ffffff", background: "#7a2e5e", border: 0, borderRadius: "0.375rem" }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
