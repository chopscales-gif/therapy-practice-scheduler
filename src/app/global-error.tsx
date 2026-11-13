"use client";

/** Replaces the whole page when the root layout itself fails, for instance while the database is waking up. */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: "4rem 1rem", color: "#1d2030", background: "#f5f5f1" }}>
        <main style={{ maxWidth: "40rem", margin: "0 auto" }}>
          <title>This page did not load</title>
          <h1 style={{ fontSize: "1.75rem" }}>This page did not load</h1>
          <p style={{ lineHeight: 1.6 }}>The demo may still be waking up. Give it a moment and try again.</p>
          <button type="button" onClick={() => retry()} style={{ marginTop: "1rem", padding: "0.6rem 1.1rem", font: "inherit", fontWeight: 600, cursor: "pointer" }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
